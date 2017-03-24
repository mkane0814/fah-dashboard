/* jshint esversion: 6 */

const http = require('http');
const async = require('async');
var MongoClient = require('mongodb').MongoClient;

const url_db = 'mongodb://localhost:27017/folding';
const url_user = 'http://fah-web.stanford.edu/daily_user_summary.txt';

var months = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

http.get(url_user, function(res) {
	if (res.statusCode !== 200) {
		console.log('HTTP request for user data failed');
		return;
	}
	
	var newData = '';
	console.log('Downloading new user data');
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
				_id : 'lastDailyUserUpdate'
			}, {
				$setOnInsert : { _id : 'lastDailyUserUpdate', date : timeStamp }
			}, {
				upsert : true
			}, function(err, result) {
				if (err) console.log(err.message);
				
				var daily;
				if (result)
					daily = timeStamp - result.date > 86400000;
				else
					daily = false;
				
				console.log('Processing new user data');
				
				newData = newData.slice(60).split('\n');
				newData.pop();
				
				var newDataMap = new Map();
				for (var i = 0; i < newData.length; i++) {
					var oneUser = newData[i].split('\t');
					oneUser[1] = parseInt(oneUser[1]);
					oneUser[2] = parseInt(oneUser[2]);
					var key = oneUser[0] + oneUser[3];
					newDataMap.set(key, oneUser);
				}
				newData = null;
				
				db.collection('users').ensureIndex({ score : -1 }, function(err, result) {
					if (err) console.log(err.message);
					
					console.log('Loading collection into memory');
					
					db.collection('users').find().sort({ score : -1 }).toArray(function(err, users) {
						if (err) return console.log(err.message);
						
						var map = new Map();
						for (var i = 0; i < users.length; i++) {
							var key = users[i]._id.name + users[i]._id.teamID;
							map.set(key, users[i]);
						}
						
						console.log('Updating existing user data');
		
						for (var i = 0; i < users.length; i++) {
							var doc = users[i];
							var key = doc._id.name + doc._id.teamID;
							
							if(newDataMap.has(key)) {
								var update = newDataMap.get(key);
								doc.hourly.push({
									score : doc.score,
									units : doc.units,
									rank : doc.rank,
									date : doc.date
								});
								doc.score = update[1];
								doc.units = update[2];
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
						
						console.log('Adding new users to the collection');
						
						for (var [key, value] of newDataMap) {
							var newUser = value;
							users.push({
								_id: {
									name: newUser[0],
									teamID: newUser[3]
								},
								score: newUser[1],
								units: newUser[2],
								date: timeStamp,
								rank: null,
								scoreChange: null,
								unitsChange: null,
								rankChange: null,
								hourly: [],
								daily: []
							});
							map.set(key, users[users.length - 1]);
						}
						newDataMap.clear();
						
						console.log('Sorting user documents');
						
						for (var i = 1; i < users.length; i++) {
							var j = i;
							while (j > 0 && users[j - 1].score < users[j].score) {
								var swap = users[j - 1];
								users[j - 1] = users[j];
								users[j] = swap;
								j--;
							}
						}
						
						console.log('Storing user documents in the database');
						
						async.eachOfLimit(users, 2, function(doc, index, cb) {
							doc.rank = index + 1;
							db.collection('users').replaceOne({
								_id : { name : doc._id.name, teamID : doc._id.teamID }
							}, doc, {
								upsert : true
							}, function(err, result) {
								if (err) console.log(err.message);
								cb();
							});
						}, function(err) {
							console.log('Hourly update for users complete');
							if (daily) {
								var lastDailyUpdate = timeStamp + 1800000;
								db.collection('lastDailyUpdates').findOneAndUpdate({
									_id : 'lastDailyUserUpdate'
								}, {
									$set : { date : lastDailyUpdate }
								}, function(err, result) {
									console.log('Daily update for users complete');
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