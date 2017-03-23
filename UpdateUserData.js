/* jshint esversion: 6 */

const http = require('http');
const async = require('async');
const cron = require('node-cron');
var MongoClient = require('mongodb').MongoClient;

const url_db = 'mongodb://localhost:27017/folding';
const url_user = 'http://fah-web.stanford.edu/daily_user_summary.txt';

var lastDailyUpdate = new Date();

var months = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

MongoClient.connect(url_db, function(err, db) {
	if (err) return console.log(err.message);
		
	db.collection('users').ensureIndex({ score : -1 }, function(err, result) {
		if (err) console.log(err.message);
		
		db.collection('users').find().sort({ score : -1 }).toArray(function(err, users) {
			if (err) return console.log(err.message);
			
			var map = new Map();
			var refs = [];
			for (var i = 0; i < users.length; i++) {
				var key = users[i]._id.name + users[i]._id.teamID;
				userMap.set(key, users[i]);
				refs.push(users[i]);
			}
			
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
					console.log('New user data downloaded successfully');
					
					var timeStamp = new Date(
						parseInt(newData.slice(24, 28)),
						months.indexOf(newData.slice(4, 7)),
						parseInt(newData.slice(8, 10)),
						parseInt(newData.slice(11, 13)),
						parseInt(newData.slice(14, 16)),
						parseInt(newData.slice(17, 19))
					);
					var daily = timeStamp - lastDailyUpdate > 86400000;
					
					newData = newData.slice(60).split('\n');
					newData.pop();
					var visited = new Set();
					
					console.log('Processing new user data');
					
					for (var i = 0; i < newData.length; i++) {
						var oneUser = newData[i].split('\t');
						oneUser[1] = parseInt(oneUser[1]);
						oneUser[2] = parseInt(oneUser[2]);
						var key = oneUser[0] + oneUser[3];
						
						if (map.has(key)) {
							var doc = map.get(key);
							visited.add(doc.rank - 1);
							doc.hourly.push({
								score : doc.score,
								units : doc.units,
								rank : doc.rank,
								date : doc.date
							});
							doc.score = oneUser[1];
							doc.units = oneUser[2];
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
							users.push({
								_id: {
									name: oneUser[0],
									teamID: oneUser[3]
								},
								score: oneUser[1],
								units: oneUser[2],
								date: timeStamp,
								rank: null,
								scoreChange: null,
								unitsChange: null,
								rankChange: null,
								hourly: [],
								daily: []
							});
							map.set(key, users[users.length - 1]);
							refs.push(users[users.length - 1]);
							visited.add(users.length - 1);
						}
					}
					newData = null;
					
					console.log('New user data processed successfully');
					console.log('Updating old user data');
					
					for (var i = 0; i < users.length; i++)
						if (!visited.has(i)) {
							var doc = users[i];
							
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
					
					console.log('Old user data updated successfully');
					console.log('Sorting user documents');
					
					for (var i = 1; i < refs.length; i++) {
						var j = i;
						while (j > 0 && refs[j - 1].score < refs[j].score) {
							var swap = refs[j - 1];
							refs[j - 1] = refs[j];
							refs[j] = swap;
							j--;
						}
					}
					
					console.log('User documents sorted successfully');
					console.log('Storing user documents in the database');
					
					async.eachOfLimit(refs, 2, function(doc, index, cb) {
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
						console.log('User documents stored successfully');
						console.log('Hourly update for users complete');
						if (daily) {
							console.log('Daily update for users complete');
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