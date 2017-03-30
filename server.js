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

  	
  		//send response if there is a request in this directory
		app.get('/:limit/:userOrTeam', function(req, res) {
    		var userOrTeam = req.params.userOrTeam;
    		var limit = req.params.limit; 
    		//query top teams or users then send a respons1e as an object
    		

    		b.collection(teamOrUser).find().limit(limNum).sort({ score : -1 }).toArray(function(err, obj) {
				if (err) return console.log(err.message);
				console.log(obj);
				res.send(obj);
			});
		});
	
	//can uncomment below to test function
	
	var client = http.client();
	client.get('/:limit/:userOrTeam', function ())

	app.listen(3000, function (){
		console.log("Listening on port 3000");
	});
});
