/**
 Latest edit: Troy Herbison on March 28
 */

const url_db = 'mongodb://localhost:27017/folding';
var app = require('express')();
var MongoClient = require('mongodb').MongoClient
var assert = require('assert');

// Use connect method to connect to the Server
MongoClient.connect(url_db, function(err, db) {
  assert.equal(null, err);

  	//send response if there is a request in this directory
	app.get('/:limit/:userOrTeam', function(req, res) {
    	var userOrTeam = req.params.userOrTeam;
    	var limit = parseInt(req.params.limit);
			
			res.header('Access-Control-Allow-Origin', '*');

			db.collection(userOrTeam).find().sort({ score : -1 }).limit(limit).toArray(function(err, obj) {
				if (err) return console.log(err.message);
				res.send(obj);
			});
	});
	
	app.listen(3000, function() {
		console.log('Listening on port 3000');
	});
});
