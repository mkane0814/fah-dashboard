/* jshint esversion: 6 */

const http = require('http');
const async = require('async');
const cron = require('node-cron');
var MongoClient = require('mongodb').MongoClient;

const url_db = 'mongodb://localhost:27017/folding';
const url_user = 'http://fah-web.stanford.edu/daily_user_summary.txt';
const url_team = 'http://fah-web.stanford.edu/daily_team_summary.txt';

var lastDailyUserUpdate = new Date();
var lastDailyTeamUpdate = new Date();

var months = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

MongoClient.connect(url_db, function(err, db) {
	if (err) return console.log(err.message);
	
	cron.schedule('21 * * * *', function()
	{
		db.collection('users').ensureIndex({ score : -1 }, function(err, result) {
			if (err) console.log(err.message);
			
			db.collection('users').find().sort({ score : -1 }).toArray(function(err, users) {
				if (err) return console.log(err.message);
				
				var userMap = new Map();
				var userRanks = [];
				for (var i = 0, len = users.length; i < len; i++) {
					var key = users[i]._id.name + users[i]._id.teamID;
					userMap.set(key, users[i]);
					userRanks.push(users[i]);
				}
				
				http.get(url_user, function(res) {
					if (res.statusCode !== 200) {
						console.log('HTTP request for user data failed');
						return;
					}
					
					var newUserData = '';
					console.log('Downloading new user data');
					res.setEncoding('utf8');
					res.on('data', function(chunk) {
						newUserData += chunk;
					});
					res.on('end', function() {
						console.log('New user data downloaded successfully');
						
						var tstamp = new Date(
							parseInt(newUserData.slice(24, 28)),
							months.indexOf(newUserData.slice(4, 7)),
							parseInt(newUserData.slice(8, 10)),
							parseInt(newUserData.slice(11, 13)),
							parseInt(newUserData.slice(14, 16)),
							parseInt(newUserData.slice(17, 19))
						);
						var daily = tstamp - lastDailyUserUpdate > 86400000;
						
						newUserData = newUserData.slice(60).split('\n');
						newUserData.pop();
						var visited = new Set();
						
						console.log('Processing new user data');
						
						for (var i = 0; i < newUserData.length; i++) {
							var oneUser = newUserData[i].split('\t');
							oneUser[1] = parseInt(oneUser[1]);
							oneUser[2] = parseInt(oneUser[2]);
							var key = oneUser[0] + oneUser[3];
							
							if (userMap.has(key)) {
								var doc = userMap.get(key);
								visited.add(doc.rank - 1);
								doc.hourly.push({
									score : doc.score,
									units : doc.units,
									rank : doc.rank,
									date : doc.date
								});
								doc.score = oneUser[1];
								doc.units = oneUser[2];
								doc.date = tstamp;
								
								while (tstamp - doc.hourly[0].date > 88200000)
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
									date: tstamp,
									rank: null,
									scoreChange: null,
									unitsChange: null,
									rankChange: null,
									hourly: [],
									daily: []
								});
								userMap.set(key, users[users.length - 1]);
								visited.add(users.length - 1);
							}
						}
						newUserData = null;
						
						console.log('New user data processed successfully');
						console.log('Updating old user data');
						
						for (var i = 0; i < users.length; i++)
							if (!visited.has(i)) {
								var doc = users[i];
								
								while (doc.hourly.length > 0)
									if (tstamp - doc.hourly[0].date > 88200000)
										doc.hourly.shift();
								
								if (doc.hourly.length > 0) {
									doc.scoreChange = doc.score - doc.hourly[0].score;
									doc.unitsChange = doc.units - doc.hourly[0].units;
									doc.rankChange = doc.hourly[0].rank - doc.rank;	
								} else {
									doc.scoreChange = null;
									doc.unitsChange = null;
									doc.rankChange = null;
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
						
						console.log('Old user data updated successfully');
						console.log('Sorting user documents');
						
						for (var i = 1; i < userRanks.length; i++) {
							var j = i;
							while (j > 0 && userRanks[j - 1].score > userRanks[j].score) {
								var swap = userRanks[j - 1];
								userRanks[j - 1] = userRanks[j];
								userRanks[j] = swap;
								j--;
							}
						}
						
						console.log('User documents sorted successfully');
						console.log('Storing user documents in the database');
						
						async.eachOfLimit(users, 8, function(doc, index, cb) {
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
								lastDailyUserUpdate = new Date(
									tstamp.getFullYear(),
									tstamp.getMonth(),
									tstamp.getDate()
								);
							}
						});
					});
				});
			});
		});
	
		db.collection('teams').ensureIndex({ score : -1 }, function(err, result) {
			if (err) console.log(err.message);
			
			db.collection('teams').find().sort({ score : -1 }).toArray(function(err, teams) {
				if (err) return console.log(err.message);
				
				var teamMap = new Map();
				var teamRanks = [];
				for (var i = 0, len = teams.length; i < len; i++) {
					teamMap.set(teams[i]._id, teams[i]);
					teamRanks.push(teams[i]);
				}
				
				http.get(url_team, function(res) {
					if (res.statusCode !== 200) {
						console.log('HTTP request for team data failed');
						return;
					}
					
					var newTeamData = '';
					console.log('Downloading new team data');
					res.setEncoding('utf8');
					res.on('data', function(chunk) {
						newTeamData += chunk;
					});
					res.on('end', function() {
						console.log('New team data downloaded successfully');
						
						var tstamp = new Date(
							parseInt(newTeamData.slice(24, 28)),
							months.indexOf(newTeamData.slice(4, 7)),
							parseInt(newTeamData.slice(8, 10)),
							parseInt(newTeamData.slice(11, 13)),
							parseInt(newTeamData.slice(14, 16)),
							parseInt(newTeamData.slice(17, 19))
						);
						var daily = tstamp - lastDailyTeamUpdate > 86400000;
						
						newTeamData = newTeamData.slice(52).split('\n');
						newTeamData.pop();
						var visited = new Set();
						
						console.log('Processing new team data');
						
						for (var i = 0; i < newTeamData.length; i++) {
							var oneTeam = newTeamData[i].split('\t');
							oneTeam[2] = parseInt(oneTeam[2]);
							oneTeam[3] = parseInt(oneTeam[3]);
							
							if (teamMap.has(oneTeam[0])) {
								var doc = teamMap.get(oneTeam[0]);
								visited.add(doc.rank - 1);
								doc.hourly.push({
									score : doc.score,
									units : doc.units,
									rank : doc.rank,
									date : doc.date
								});
								doc.score = oneTeam[2];
								doc.units = oneTeam[3];
								doc.date = tstamp;
								
								while (tstamp - doc.hourly[0].date > 88200000)
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
									date: tstamp,
									rank: null,
									scoreChange: null,
									unitsChange: null,
									rankChange: null,
									hourly: [],
									daily: []
								});
								teamMap.set(oneTeam[0], teams[teams.length - 1]);
								visited.add(teams.length - 1);
							}
						}
						newTeamData = null;
						
						console.log('New team data processed successfully');
						console.log('Updating old team data');
						
						for (var i = 0; i < teams.length; i++)
							if (!visited.has(i)) {
								var doc = teams[i];
								
								while (doc.hourly.length > 0)
									if (tstamp - doc.hourly[0].date > 88200000)
										doc.hourly.shift();
								
								if (doc.hourly.length > 0) {
									doc.scoreChange = doc.score - doc.hourly[0].score;
									doc.unitsChange = doc.units - doc.hourly[0].units;
									doc.rankChange = doc.hourly[0].rank - doc.rank;	
								} else {
									doc.scoreChange = null;
									doc.unitsChange = null;
									doc.rankChange = null;
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
						
						console.log('Old team data updated successfully');
						console.log('Sorting team documents');
						
						for (var i = 1; i < teamRanks.length; i++) {
							var j = i;
							while (j > 0 && teamRanks[j - 1].score > teamRanks[j].score) {
								var swap = teamRanks[j - 1];
								teamRanks[j - 1] = teamRanks[j];
								teamRanks[j] = swap;
								j--;
							}
						}
						
						console.log('Team documents sorted successfully');
						console.log('Storing team documents in the database');
						
						async.eachOfLimit(teams, 8, function(doc, index, cb) {
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
								lastDailyTeamUpdate = new Date(
									tstamp.getFullYear(),
									tstamp.getMonth(),
									tstamp.getDate()
								);
							}
						});
					});
				});
			});
		});
	});
});