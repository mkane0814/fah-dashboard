/* jshint esversion: 6 */

const http = require('http');
const async = require('async');
const cron = require('node-cron');
var MongoClient = require('mongodb').MongoClient;

const url_db = 'mongodb://localhost:27017/folding';
const url_team = 'http://fah-web.stanford.edu/daily_team_summary.txt';

var lastDailyUpdate = new Date();

var months = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

MongoClient.connect(url_db, function(err, db) {
	if (err) return console.log(err.message);
	
	db.collection('teams').ensureIndex({ score : -1 }, function(err, result) {
		if (err) console.log(err.message);
		
		db.collection('teams').find().sort({ score : -1 }).toArray(function(err, teams) {
			if (err) return console.log(err.message);
			
			var map = new Map();
			var refs = [];
			for (var i = 0; i < teams.length; i++) {
				map.set(teams[i]._id, teams[i]);
				refs.push(teams[i])
			}
			
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
					console.log('New team data downloaded successfully');
					
					var timeStamp = new Date(
						parseInt(newData.slice(24, 28)),
						months.indexOf(newData.slice(4, 7)),
						parseInt(newData.slice(8, 10)),
						parseInt(newData.slice(11, 13)),
						parseInt(newData.slice(14, 16)),
						parseInt(newData.slice(17, 19))
					);
					var daily = timeStamp - lastDailyUpdate > 86400000;
					
					newData = newData.slice(52).split('\n');
					newData.pop();
					var visited = new Set();
					
					console.log('Processing new team data');
					
					for (var i = 0; i < newData.length; i++) {
						var oneTeam = newData[i].split('\t');
						oneTeam[2] = parseInt(oneTeam[2]);
						oneTeam[3] = parseInt(oneTeam[3]);
						
						if (map.has(oneTeam[0])) {
							var doc = map.get(oneTeam[0]);
							visited.add(doc.rank - 1);
							doc.hourly.push({
								score : doc.score,
								units : doc.units,
								rank : doc.rank,
								date : doc.date
							});
							doc.score = oneTeam[2];
							doc.units = oneTeam[3];
							doc.date = timeStamp;
							
							while (timeStamp - doc.hourly[0].date > 88200000)
								doc.hourly.shift();
							
							doc.scoreChange = doc.score - doc.hourly[0].score;
							doc.unitsChange = doc.units - doc.hourly[0].units;
							doc.rankChange = doc.hourly[0].rank - doc.rank;	
							
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
						} else {
							teams.push({
								_id: oneTeam[1],
								ID: oneTeam[0],
								score: oneTeam[2],
								units: oneTeam[3],
								date: timeStamp,
								rank: null,
								scoreChange: null,
								unitsChange: null,
								rankChange: null,
								hourly: [],
								daily: []
							});
							map.set(oneTeam[0], teams[teams.length - 1]);
							refs.push(teams[teams.length - 1]);
							visited.add(teams.length - 1);
						}
					}
					newData = null;
					
					console.log('New team data processed successfully');
					console.log('Updating old team data');
					
					for (var i = 0; i < teams.length; i++)
						if (!visited.has(i)) {
							var doc = teams[i];
							
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
						}
					visited = null;
					
					console.log('Old team data updated successfully');
					console.log('Sorting team documents');
					
					for (var i = 1; i < refs.length; i++) {
						var j = i;
						while (j > 0 && refs[j - 1].score < refs[j].score) {
							var swap = refs[j - 1];
							refs[j - 1] = refs[j];
							refs[j] = swap;
							j--;
						}
					}
					
					console.log('Team documents sorted successfully');
					console.log('Storing team documents in the database');
					
					async.eachOfLimit(refs, 2, function(doc, index, cb) {
						doc.rank = index + 1;
						db.collection('teams').replaceOne({ _id : doc._id }, doc, {
							upsert : true
						}, function(err, result) {
							if (err) console.log(err.message);
							cb();
						});
					}, function(err) {
						console.log('Team documents stored successfully');
						console.log('Hourly update for teams complete');
						if (daily) {
							console.log('Daily update for teams complete');
							lastDailyUpdate = new Date(
								timeStamp.getFullYear(),
								timeStamp.getMonth(),
								timeStamp.getDate()
							);
						}
					});
				});
			});
		});
	});
});
