// Original Author: Nathan Streyer
// Edited by: Nicholas Matteson

const http = require('http');
const fs = require('fs');
const readline = require('readline');
var MongoClient = require('mongodb').MongoClient;

const url_db = 'mongodb://localhost:27017/folding';
const url_user = 'http://fah-web.stanford.edu/daily_user_summary.txt';
const url_team = 'http://fah-web.stanford.edu/daily_team_summary.txt';

var months = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/*
Added the script to auto create the directory if it does not exist
*/ 
fs.stat('./tmp/', function (err){
    if(err) {
        console.log("DataFiles directory does not exist. Creating ./tmp/");
        fs.mkdir('./tmp/');
    }
});

DownloadData(url_user, 'tmp/users.txt', StoreUserData);
//StoreUserData();

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
	})
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
			parseInt(newData.slice(24, 28)),			// year
			months.indexOf(newData.slice(4, 7)),			// month
			parseInt(newData.slice(8, 10)),				// date
			parseInt(newData.slice(11, 13)),			// hours
			parseInt(newData.slice(14, 16)),			// minutes
			parseInt(newData.slice(17, 19))				// seconds
		);

		newData = newData.slice(60).split('\n');	// slice header off, split into lines
		var length = newData.length - 2;		// last line is blank

          // index creation for possible optimization of insertion/searches (not yet utilized)
          // users.createIndex({ name : 1, teamID : 1 });

		
		(function InsertOrUpdate(i) {
			var user = newData[i].split('\t');	// split line into fields
			user[1] = parseInt(user[1]);		// get score as int
			user[2] = parseInt(user[2]);		// ...
			user[3] = parseInt(user[3]);		// ...
			
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
		})(0)
	});
}

