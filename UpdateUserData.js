/* jshint esversion: 6 */

const http = require('http');
const async = require('async');
const MongoClient = require('mongodb').MongoClient;

const path = {
	db: "mongodb://localhost:27017/folding",
	usersUrl: "http://fah-web/stanford.edu/daily_user_summary.txt"
};

const months = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

http.get(path.usersUrl, function(res) {
	if (res.statusCode !== 200) {
		console.log('HTTP request for user data failed');
		return;
	}
	
	let newData = '';
	console.log('Downloading new user data');
	res.setEncoding('utf8');
	res.on('data', function(chunk) {
		newData += chunk;
	});
	res.on('end', function() {
		MongoClient.connect(path.db, function(err, db) {
			if (err) return console.log(err.message);
			
			console.log('Processing new user data');
			
			let timeStamp = new Date(
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
				upsert : true,
				returnOriginal : false
			}, function(err, result) {
				if (err) console.log(err.message);
				
				let daily = timeStamp - result.date > 84600000;
				
				newData = newData.slice(60).split('\n');
				newData.pop();
				
				let newDataMap = new Map();
				for (let i = 0; i < newData.length; i++) {
					let oneUser = newData[i].split('\t');
					oneUser[1] = parseInt(oneUser[1]);
					oneUser[2] = parseInt(oneUser[2]);
					let key = oneUser[0] + oneUser[3];
					newDataMap.set(key, oneUser);
				}
				newData = null;
				
				db.collection('users').createIndexes([
					{ key : { rank : 1 }, name : 'rank' },
					{ key : { score : -1 }, name : 'score' },
					{ key : { units : -1 }, name : 'units' },
					{ key : { rankChange : -1 }, name : 'rankChange' },
					{ key : { scoreChange : -1 }, name : 'scoreChange' },
					{ key : { unitsChange : -1 }, name : 'unitsChange' }
				], function(err, result) {
					if (err) console.log(err.message);
					
					console.log('Loading user documents into memory');
					
					db.collection('users').find().sort({ score : -1 }).toArray(function(err, users) {
						if (err) return console.log(err.message);
						
						console.log('Updating existing user data');
		
						for (let i = 0; i < users.length; i++) {
							let doc = users[i];
							let key = doc._id.name + doc._id.teamID;
							
							if (daily) {
								doc.daily.push({
									rank : doc.rank,
									score: doc.score,
									units: doc.units,
									rankChange : doc.rankChange,
									scoreChange: doc.scoreChange,
									unitsChange: doc.unitsChange,
									date : doc.date
								});
							}
							
							if(newDataMap.has(key)) {
								let update = newDataMap.get(key);
								doc.hourly.push({
									rank : doc.rank,
									score : doc.score,
									units : doc.units,
									date : doc.date
								});
								doc.score = update[1];
								doc.units = update[2];
								doc.date = timeStamp;
								
								newDataMap.delete(key);
							}
							
							doc.rankChange = null;
							doc.scoreChange = null;
							doc.unitsChange = null;
							
							while (doc.hourly.length > 0) {
								if (timeStamp - doc.hourly[0].date > 88200000)
									doc.hourly.shift();
								else {
									doc.rankChange = doc.hourly[0].rank - doc.rank;
									doc.scoreChange = doc.score - doc.hourly[0].score;
									doc.unitsChange = doc.units - doc.hourly[0].units;
									break;
								}
							}
						}
						
						console.log('Adding new users to the collection');
						
						for (let [key, value] of newDataMap) {
							let newUser = value;
							users.push({
								_id: {
									name: newUser[0],
									teamID: newUser[3]
								},
								rank : null,
								score: newUser[1],
								units: newUser[2],
								rankChange : null,
								scoreChange: null,
								unitsChange: null,
								date : timeStamp,
								hourly: [],
								daily: []
							});
						}
						
						console.log('Sorting user documents');
						
						for (let i = 1; i < users.length; i++) {
							let j = i;
							while (j > 0 && users[j - 1].score < users[j].score) {
								let swap = users[j - 1];
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
								db.collection('lastDailyUpdates').findOneAndUpdate({
									_id : 'lastDailyUserUpdate'
								}, {
									$set : { date : timeStamp }
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
