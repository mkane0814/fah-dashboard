/*

Make sure to get rid of the createIndex statements in both updateRanks function
after you run it for the first time. If you drop all the users/teams from the
collections, you will want to include them for the first run again.

*/


const http = require('http');
const fs = require('fs');
const cron = require('node-cron');
var MongoClient = require('mongodb').MongoClient;

const url_db = 'mongodb://localhost:27017/folding';
const url_user = 'http://fah-web.stanford.edu/daily_user_summary.txt';
const url_team = 'http://fah-web.stanford.edu/daily_team_summary.txt';

var months = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

if (!fs.statSync('tmp'))
    fs.mkdir('tmp');

// to run hourly update once

DownloadUserData();
DownloadTeamData();


/* to run daily update once

StoreUserDailyHistory();
StoreTeamDailyHistory();
*/

/* to schedule hourly updates

cron.schedule('25 * * * *', function() {
	DownloadUserData();
	DownloadTeamData();
});
*/

/* to schedule daily updates

cron.schedule('55 0 * * *', function() {
	StoreUserDailyHistory();
	StoreTeamDailyHistory();
});
*/

function DownloadUserData()
{
	http.get(url_user, function(res) {
		if (res.statusCode !== 200) {
			console.log('HTTP request for user data failed');
			return;
		}
    
		let file = fs.createWriteStream('tmp/users.txt');
		console.log('Getting new user data');
		res.setEncoding('utf8');
		res.on('data', function(chunk) {
			file.write(chunk);
		});
		res.on('end', function() {
			console.log('User data downloaded successfully');
			file.close();
			StoreUserData();
		});
	})
}

function StoreUserData()
{
	MongoClient.connect(url_db, function(err, db) {
		if (err) return console.log('Failed to connect to the database');

		var users = db.collection('users');
		var newData = fs.readFileSync('tmp/users.txt', 'utf8');			// read file into memory
		var date = new Date(
			parseInt(newData.slice(24, 28)),						// year
			months.indexOf(newData.slice(4, 7)),				// month
			parseInt(newData.slice(8, 10)),							// date
			parseInt(newData.slice(11, 13)),						// hours
			parseInt(newData.slice(14, 16)),						// minutes
			parseInt(newData.slice(17, 19))							// seconds
		);

		newData = newData.slice(60).split('\n');				// slice header off, split into lines
		var length = newData.length - 1;								// last line is blank

		console.log('Storing new user data');
		
		// recursive for serial insertion of each user's data
		(function InsertOrUpdate(i) {
			if (i < length)															// if we haven't reached end
			{
				var user = newData[i].split('\t');				// split line into fields
				user[1] = parseInt(user[1]);							// get score as int
				user[2] = parseInt(user[2]);							// ... units
				user[3] = parseInt(user[3]);							// ... teamID
				
				// if user is already in db, return their doc, else return null doc
				users.findOne({ _id: { name: user[0], teamID: user[3] } }, function(err, doc) {
					if (err) {
						console.log(err.message);			// log error and keep going
						InsertOrUpdate(i + 1);
					} else if (doc) {								// update existing doc
						doc.hourly.push({
							score: doc.score,						// add entry to hourly history
							rank: doc.rank,
							date: doc.date
						});
						doc.score = user[1];					// update fields with new data
						doc.units = user[2];
						doc.date = date;
						
						// replace the old doc with the new one
						users.replaceOne({ _id: { name: user[0], teamID: user[3] } }, doc, function(err, doc) {
							if (err) console.log(err.message);
							InsertOrUpdate(i + 1);									// recursive call for next user
						});
					} else {																		// insert a doc for new user
						users.insertOne({
							_id: {
								name: user[0],
								teamID: user[3]
							},
							score: user[1],
							units: user[2],
							date: date,
							rank: null,
							scoreChange: null,
							rankChange: null,
							hourly: [],
							daily: []
						}, function(err, result) {
							if (err) console.log(err.message);
							InsertOrUpdate(i + 1);										// recursive call for next user
						});
					}
				});
			}
			else
				UpdateUserRank(db, date);												// base case
		})(0)
	});
}

function UpdateUserRank(db, date)
{
	var users = db.collection('users');
	users.createIndex({ score: -1 });									// RUN THIS THE FIRST TIME ONLY
	var cursor = users.find().sort({ score: -1 });		// iterate in descending order of points
	var i = 1;																				// rank
	
	console.log('Updating user ranks');
	
	// recursive for serial insertion of rank
	(function UpdateOne(cursor) {
		cursor.next(function(err, doc) {
			if (err) {
				console.log(err.message);						// log error and keep going
				i++;
				UpdateOne(cursor);
			} else if (doc) {
				doc.rank = i;
				try {																									// get rid of hourly data older than 24 hours
					while (date - doc.hourly[0].date > 88200000)				// fails if hourly is empty, so catch that
						doc.hourly.shift();																// exception and ignore it
				} catch(e) {}
				if (doc.hourly.length > 0) {														// update based on oldest data in hourly history
					doc.scoreChange = doc.score - doc.hourly[0].score;
					doc.rankChange = doc.rank - doc.hourly[0].rank;
				} else {																								// assign to null if no hourly history present
					doc.scoreChange = null;
					doc.rankChange = null;
				}
				
				// replace the old doc with the new one
				users.replaceOne({
					_id : { name : doc._id.name, teamID : doc._id.teamID }
				}, doc, function(err, doc) {
					if (err) console.log(err.message);
					i++;
					UpdateOne(cursor);													// recursive call for next user
				});
			} else {
				console.log('User ranks updated successfully');			// finished with users
				console.log('Hourly update for users complete');
				db.close();
			}
		});
	})(cursor);
}

function DownloadTeamData()
{
	http.get(url_team, function(res) {
		if (res.statusCode !== 200) {
			console.log('HTTP request for team data failed');
			return;
		}
    
		let file = fs.createWriteStream('tmp/teams.txt');
		console.log('Getting new team data');
		res.setEncoding('utf8');
		res.on('data', function(chunk) {
			file.write(chunk);
		});
		res.on('end', function() {
			console.log('Team data downloaded successfully');
			file.close();
			StoreTeamData();
		});
	})
}

function StoreTeamData()
{
	MongoClient.connect(url_db, function(err, db) {
		if (err) return console.log('Failed to connect to the database');
		
		var teams = db.collection('teams');
		var newData = fs.readFileSync('tmp/teams.txt', 'utf8');			// read file into memory
		var date = new Date(
			parseInt(newData.slice(24, 28)),						// year
			months.indexOf(newData.slice(4, 7)),				// month
			parseInt(newData.slice(8, 10)),							// date
			parseInt(newData.slice(11, 13)),						// hours
			parseInt(newData.slice(14, 16)),						// minutes
			parseInt(newData.slice(17, 19))							// seconds
		);
		
		newData = newData.slice(52).split('\n');				// slice header off, split into lines
		var length = newData.length - 1;								// last line is blank
		
		console.log('Storing new team data');
		
		// recursive for serial insertion of each team's data
		(function InsertOrUpdate(i) {
			if (i < length)															// if we haven't reached end
			{
				var team = newData[i].split('\t');				// split line into fields
				team[0] = parseInt(team[0]);							// get id as int
				team[2] = parseInt(team[2]);							// ... score
				team[3] = parseInt(team[3]);							// ... units
				
				// if team is already in db, return their doc, else return null doc
				teams.findOne({ _id: team[1] }, function(err, doc) {
					if (err) {
						console.log(err.message);			// log error and keep going
						InsertOrUpdate(i + 1);
					} else if (doc) {								// update existing doc
						doc.hourly.push({
							score: doc.score,						// add entry to hourly history
							rank: doc.rank,
							date: doc.date
						});
						doc.score = team[2];					// update fields with new data
						doc.units = team[3];
						doc.date = date;
						
						// replace the old doc with the new one
						teams.replaceOne({ _id: team[1] }, doc, function(err, doc) {
							if (err) console.log(err.message);
							InsertOrUpdate(i + 1);									// recursive call for next team
						});
					} else {																		// insert a doc for new team
						teams.insertOne({
							_id: team[1],
							ID: team[0],
							score: team[2],
							units: team[3],
							date: date,
							rank: null,
							scoreChange: null,
							rankChange: null,
							hourly: [],
							daily: []
						}, function(err, result) {
							if (err) console.log(err.message);
							InsertOrUpdate(i + 1)										// recursive call for next team
						});
					}
				});
			}
			else
				UpdateTeamRank(db, date);											// base case
		})(0)
	});
}

function UpdateTeamRank(db, date)
{
	var teams = db.collection('teams');
	teams.createIndex({ score: -1 });									// RUN THIS THE FIRST TIME ONLY
	var cursor = teams.find().sort({ score: -1 });		// iterate in descending order of points
	var i = 1;																				// rank
	
	console.log('Updating team ranks');
	
	(function UpdateOne(cursor) {
		cursor.next(function(err, doc) {
			if (err) {
				console.log(err.message);
				i++;
				UpdateOne(cursor);
			} else if (doc) {
				doc.rank = i;
				try {																									// get rid of hourly data older than 24 hours
					while (date - doc.hourly[0].date > 88200000)				// fails if hourly is empty, so catch that
						doc.hourly.shift();																// exception and ignore it
				} catch(e) {}
				if (doc.hourly.length > 0) {														// update based on oldest data in hourly history
					doc.scoreChange = doc.score - doc.hourly[0].score;
					doc.rankChange = doc.rank - doc.hourly[0].rank;
				} else {																								// assign to null if no hourly history present
					doc.scoreChange = null;
					doc.rankChange = null;
				}
				teams.replaceOne( { _id : doc._id }, doc, function(err, doc) {
					if (err) console.log(err.message);
					i++;
					UpdateOne(cursor);													// recursive call for next team
				});
			} else {
				console.log('Team ranks updated successfully');			// finished with users
				console.log('Hourly update for teams complete');
				db.close();
			}
		});
	})(cursor);
}

function StoreUserDailyHistory()
{
	MongoClient.connect(url_db, function(err, db) {
		if (err) return console.log('Failed to connect to the database');
		
		users = db.collection('users');
		cursor = users.find();
		
		console.log('Updating daily history for users');
		
		(function StoreUserDaily(cursor) {
			cursor.next(function(err, doc) {
				if (err) {
					console.log(err.message);
					StoreUserDaily(cursor);
				} else if (doc) {
					doc.daily.push({
						score: doc.score,
						rank: doc.rank,
						scoreChange: doc.scoreChange,
						rankChange: doc.rankChange,
						date: doc.date
					});
					users.replaceOne({
						_id : { name : doc._id.name, teamID : doc._id.teamID }
					}, doc, function(err, doc) {
						if (err) console.log(err.message);
						StoreUserDaily(cursor);
					});
				} else {
					console.log('Daily update for users complete');
					db.close();
				}
			});
		})(cursor);
	});
}

function StoreTeamDailyHistory()
{
	MongoClient.connect(url_db, function(err, db) {
		if (err) return console.log('Failed to connect to the database');
		
		teams = db.collection('teams');
		cursor = teams.find();
		
		console.log('Updating daily history for teams');
		
		(function StoreTeamDaily(cursor) {
			cursor.next(function(err, doc) {
				if (err) {
					console.log(err.message);
					StoreTeamDaily(cursor);
				} else if (doc) {
					doc.daily.push({
						score: doc.score,
						rank: doc.rank,
						scoreChange: doc.scoreChange,
						rankChange: doc.rankChange,
						date: doc.date
					});
					teams.replaceOne({ _id : doc._id }, doc, function(err, doc) {
						if (err) console.log(err.message);
						StoreTeamDaily(cursor);
					});
				} else {
					console.log('Daily update for teams complete');
					db.close();
				}
			});
		})(cursor);
	});
}
