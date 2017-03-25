/* jshint esversion: 6 */

const http = require('http');
const async = require('async');
var MongoClient = require('mongodb').MongoClient;

const url_db = 'mongodb://localhost:27017/folding';
const url_team = 'http://fah-web.stanford.edu/daily_team_summary.txt';

var months = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

http.get(url_team, function(res) {
	if (res.statusCode !== 200) {
		console.log('HTTP request for team data failed');
		return;
	}
	
	var newData = '';
	console.log('Downloading new team data');
	res.setEncoding('utf8');
	res.on('data', function(chunk) {
		newData += chunk;
	});
	res.on('end', function() {
		MongoClient.connect(url_db, function(err, db) {
			if (err) return console.log(err.message);
			
			var timeStamp = new Date(
				parseInt(newData.slice(24, 28)),
				months.indexOf(newData.slice(4, 7)),
				parseInt(newData.slice(8, 10)),
				parseInt(newData.slice(11, 13)),
				parseInt(newData.slice(14, 16)),
				parseInt(newData.slice(17, 19))
			);
			
			db.collection('lastDailyUpdates').findOneAndUpdate({
				_id : 'lastDailyTeamUpdate'
			}, {
				$setOnInsert : { _id : 'lastDailyTeamUpdate', date : timeStamp }
			}, {
				upsert : true,
				returnOriginal : false
			}, function(err, result) {
				if (err) console.log(err.message);
				
				var daily = timeStamp - result.date > 84600000;
				
				console.log('Processing new team data');
				
				newData = newData.slice(52).split('\n');
				newData.pop();
				
				var newDataMap = new Map();
				for (var i = 0; i < newData.length; i++) {
					var oneTeam = newData[i].split('\t');
					oneTeam[2] = parseInt(oneTeam[2]);
					oneTeam[3] = parseInt(oneTeam[3]);
					newDataMap.set(oneTeam[1], oneTeam);
				}
				newData = null;
			
				db.collection('teams').ensureIndex({ score : -1 }, function(err, result) {
					if (err) console.log(err.message);
					
					console.log('Loading team documents into memory');
					
					db.collection('teams').find().sort({ score : -1 }).toArray(function(err, teams) {
						if (err) return console.log(err.message);
						
						var map = new Map();
						for (var i = 0; i < teams.length; i++)
							map.set(teams[i]._id, teams[i]);
						
						console.log('Updating existing team data');

						for (var i = 0; i < teams.length; i++) {
							var doc = teams[i];
							var key = doc._id;
							
							if (daily) {
								doc.daily.push({
									score: doc.score,
									units: doc.units,
									rank: doc.rank,
									scoreChange: doc.scoreChange,
									unitsChange: doc.unitsChange,
									rankChange: doc.rankChange,
									date: doc.date
								});
							}
							
							if(newDataMap.has(key)) {
								var update = newDataMap.get(key);
								doc.hourly.push({
									score : doc.score,
									units : doc.units,
									rank : doc.rank,
									date : doc.date
								});
								doc.score = update[2];
								doc.units = update[3];
								doc.date = timeStamp;
								
								newDataMap.delete(key);
							}
							
							doc.scoreChange = null;
							doc.unitsChange = null;
							doc.rankChange = null;
							
							while (doc.hourly.length > 0) {
								if (timeStamp - doc.hourly[0].date > 88200000)
									doc.hourly.shift();
								else {
									doc.scoreChange = doc.score - doc.hourly[0].score;
									doc.unitsChange = doc.units - doc.hourly[0].units;
									doc.rankChange = doc.hourly[0].rank - doc.rank;
									break;
								}
							}
						}
						
						console.log('Adding new teams to the collection');
						
						for (var [key, value] of newDataMap) {
							var newTeam = value;
							teams.push({
								_id: newTeam[1],
								ID: newTeam[0],
								score: newTeam[2],
								units: newTeam[3],
								date: timeStamp,
								rank: null,
								scoreChange: null,
								unitsChange: null,
								rankChange: null,
								hourly: [],
								daily: []
							});
						}
						
						console.log('Sorting team documents');
						
						for (var i = 1; i < teams.length; i++) {
							var j = i;
							while (j > 0 && teams[j - 1].score < teams[j].score) {
								var swap = teams[j - 1];
								teams[j - 1] = teams[j];
								teams[j] = swap;
								j--;
							}
						}
						
						console.log('Storing team documents in the database');
						
						async.eachOfLimit(teams, 2, function(doc, index, cb) {
							doc.rank = index + 1;
							db.collection('teams').replaceOne({ _id : doc._id }, doc, {
								upsert : true
							}, function(err, result) {
								if (err) console.log(err.message);
								cb();
							});
						}, function(err) {
							console.log('Hourly update for teams complete');
							if (daily) {
								db.collection('lastDailyUpdates').findOneAndUpdate({
									_id : 'lastDailyTeamUpdate'
								}, {
									$set : { date : timeStamp }
								}, function(err, result) {
									console.log('Daily update for teams complete');
									db.close();
								});
							} else db.close();
						});
					});
				});
			});
		});
	});
});
