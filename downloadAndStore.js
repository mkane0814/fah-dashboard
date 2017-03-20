// Original Author: Nathan Streyer
// Edited by: Nicholas Matteson

/* jshint esversion: 6 */

const http = require('http');
const fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
const cron = require('node-cron');

const url_db = 'mongodb://localhost:27017/folding';
const url_user = 'http://fah-web.stanford.edu/daily_user_summary.txt';
const url_team = 'http://fah-web.stanford.edu/daily_team_summary.txt';

var months = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// made this synchronous so it gets done right away
if (fs.statSync('./tmp/') === null) {
		console.log('tmp directory does not exist. Creating ./tmp/');
    fs.mkdir('./tmp/');
}

// initial download and store functions
DownloadData(url_team, 'tmp/teams.txt', StoreTeamData);
DownloadData(url_user, 'tmp/users.txt', StoreUserData);

// making the scheduled task to run DownloadData, StoreUserData, and StoreTeamData
cron.schedule('0 * * * *', function () {
	DownloadData(url_user, 'tmp/users.txt', StoreUserData);
	DownloadData(url_team, 'tmp/teams.txt', StoreTeamData);
});



function DownloadData(url, path, cb)
{
	http.get(url, function(res) {
		if (res.statusCode !== 200) {
			console.log('HTTP request failed');
			return;
		}
    
		let file = fs.createWriteStream(path);
		console.log('Getting new data');
		res.setEncoding('utf8');
		res.on('data', function(chunk) {
			file.write(chunk);
		});
		res.on('end', function() {
			console.log('Data downloaded successfully');
			file.close();
			return cb();
		});
	});
}

/*
The advantage to this is that putting recursive calls in the callback ensures that the docs
are inserted into the db in order. I got this idea from http://metaduck.com/01-asynchronous-iteration-patterns.html
*/

function StoreUserData()
{
	MongoClient.connect(url_db, function(err, db) {
		if (err) return console.log('Failed to connect to the database');
		console.log('Connected successfully to the database');
		
          // DEBUGGING ONLY REMOVE IN THE FUTURE
          // db.dropCollection('users');

		var users = db.collection('users');
		var newData = fs.readFileSync('tmp/users.txt', 'utf8');		// read entire file to memory
		var date = new Date(
			parseInt(newData.slice(24, 28)),					// year
			months.indexOf(newData.slice(4, 7)),			// month
			parseInt(newData.slice(8, 10)),						// date
			parseInt(newData.slice(11, 13)),					// hours
			parseInt(newData.slice(14, 16)),					// minutes
			parseInt(newData.slice(17, 19))						// seconds
		);

		newData = newData.slice(60).split('\n');	// slice header off, split into lines
		var length = newData.length - 2;		// last line is blank

          // index creation for possible optimization of insertion/searches (not yet utilized)
          // users.createIndex({ name : 1, teamID : 1 });

		
		(function InsertOrUpdate(i) {
			var user = newData[i].split('\t');	// split line into fields
			user[1] = parseInt(user[1]);		// get score as int
			user[2] = parseInt(user[2]);		// ... units
			user[3] = parseInt(user[3]);		// ... teamID
			
			// see if the user is already in the db, returns null doc if not
			users.findOne({ _id: { name: user[0], teamID: user[3] } }, function(err, doc) {
				if (err) {
					console.log(err.message);
					if (i < length) return InsertOrUpdate(i + 1);	// don't stop if error
					else {
							db.close();
							console.log('User data added successfully');
					}
				} else if (doc) {
					doc.hourly.push({			// if found, update doc
						score: doc.score,		// add score, rank, date to hourly history
						rank: doc.rank,			// do this first because about to overwrite
						date: doc.date
					});
					while (date - doc.hourly[0].date > 88200000)	// get rid of hourly data older than 1 day
						doc.hourly.shift();
					doc.score = user[1];			// update fields based on new data
					doc.units = user[2];
					doc.date = date;
					doc.scoreChange = doc.score - doc.hourly[0].score;
					
					// replace the old doc with the new one we just created from the old one
					users.replaceOne({ _id: { name: user[0], teamID: user[3] } }, doc, function(err, doc) {
						if (err) console.log(err.message);
						if (i < length) return InsertOrUpdate(i + 1);		// recursive call to insert next
						else {
							db.close();
							console.log('User data added successfully');
						}
					});
				} else {
					users.insertOne({			// insert new doc for users who aren't in db
						_id: {
							name: user[0],
							teamID: user[3]
						},
						score: user[1],
						units: user[2],
						date: date,
						rank: null,
						rankChange: null,
						scoreChange: null,
						hourly: [],
						daily: []
					}, function(err, result) {
						if (err) console.log(err.message);
						if (i < length) return InsertOrUpdate(i + 1);
						else {
							db.close();
							console.log('User data added successfully');
						}
					});
				}
			});
		})(0);
	});
}

function StoreTeamData()
{
	MongoClient.connect(url_db, function(err, db) {
		if (err) return console.log('Failed to connect to the database');
		console.log('Connected successfully to the database');
		
		var teams = db.collection('teams');
		var newData = fs.readFileSync('tmp/teams.txt', 'utf8');		// read entire file to memory
		var date = new Date(
			parseInt(newData.slice(24, 28)),					// year
			months.indexOf(newData.slice(4, 7)),			// month
			parseInt(newData.slice(8, 10)),						// date
			parseInt(newData.slice(11, 13)),					// hours
			parseInt(newData.slice(14, 16)),					// minutes
			parseInt(newData.slice(17, 19))						// seconds
		);
		
		newData = newData.slice(52).split('\n');			// slice header off, split into lines
		var length = newData.length - 2;							// last line is blank
		
		(function InsertOrUpdate(i) {
			var team = newData[i].split('\t');					// split line into fields
			team[0] = parseInt(team[0]);								// get id as int
			team[2] = parseInt(team[2]);								// ... score
			team[3] = parseInt(team[3]);								// ... units
			
			// see if the team is already in the db, returns null doc if not
			teams.findOne({ _id: team[1] }, function(err, doc) {
				if (err) {
					console.log(err.message);
					if (i < length) return InsertOrUpdate(i + 1);	// don't stop if error
					else {
							db.close();
							console.log('Team data added successfully');
							DownloadData(url_user, 'tmp/users.txt', StoreUserData);
					}
				} else if (doc) {
					doc.hourly.push({			// if found, update doc
						score: doc.score,		// add score, rank, date to hourly history
						rank: doc.rank,			// do this first because about to overwrite
						date: doc.date
					});
					while (date - doc.hourly[0].date > 88200000)	// get rid of hourly data older than 1 day
						doc.hourly.shift();
					doc.score = team[2];			// update fields based on new data
					doc.units = team[3];
					doc.date = date;
					doc.scoreChange = doc.score - doc.hourly[0].score;
					
					// replace the old doc with the new one we just created from the old one
					teams.replaceOne({ _id: team[1] }, doc, function(err, doc) {
						if (err) console.log(err.message);
						if (i < length) return InsertOrUpdate(i + 1);		// recursive call to insert next
						else {
							db.close();
							console.log('Team data added successfully');
							DownloadData(url_user, 'tmp/users.txt', StoreUserData);
						}
					});
				} else {
					teams.insertOne({			// insert new doc for teams who aren't in db
						_id: team[1],
						ID: team[0],
						score: team[2],
						units: team[3],
						date: date,
						rank: null,
						rankChange: null,
						scoreChange: null,
						hourly: [],
						daily: []
					}, function(err, result) {
						if (err) console.log(err.message);
						if (i < length) return InsertOrUpdate(i + 1);
						else {
							db.close();
							console.log('Team data added successfully');
							DownloadData(url_user, 'tmp/users.txt', StoreUserData);
						}
					});
				}
			});
		})(0);
	});
}
