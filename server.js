/**
 Latest edit: Troy Herbison on March 28
 */

 /* jshint esversion: 6 */

const url_db = 'mongodb://localhost:27017/folding';
var app = require('express')();
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

// Use connect method to connect to the Server
MongoClient.connect(url_db, function(err, db) {
  assert.equal(null, err);
  	
  	var obj;
  	var userOrTeam;
  	var limit;

  	function queryDB(obj, userOrTeam, limit){

  		//send response if there is a request in this directory
		app.get('/:limit/:userOrTeam', function(req, res) {
    		if(userOrTeam === undefined){ userOrTeam = req.params.userOrTeam; }
    		if(limit === undefined){ limit = req.params.limit; }
    		//query top teams or users then send a respons1e as an object
    		

    		obj = b.collection(teamOrUser).find().limit(limNum).sort({ score : -1 }).toArray(function(err, obj) {
				if (err) return console.log(err.message);
			});
			console.log(obj);
			res.send(obj);
    	
    		
		});
	}
	//can uncomment below to test function
	queryDB(obj, 'teams', 100);

	app.listen(3000);
	console.log("Listening on port 3000");

});
