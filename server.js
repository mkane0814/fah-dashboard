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
  	
  	var obj;

  	//send response if there is a request in this directory
	app.get('/', function(req, res) {
    	var requestType = req.params["name"];

    	if(requestType == "top100users")
    	{
    		//query then send results as a response
    		queryDB('users', 100, obj);
    		res.send(obj);
    	}
    	else if(requestType == "top100teams")
    	{
    		//query top 100 teams then send 100 teams as an object
    		queryDB('teams', 100, obj);
    		res.send(obj);
    	}
    	
	});


	//can uncomment below to test function
	//queryDB('teams', 100, obj);

	function queryDB(teamOrUser, limNum, obj)
	{
		db.collection(teamOrUser).find().limit(limNum).sort({ score : -1 }).toArray(function(err, obj) {
			if (err) return console.log(err.message);

			//obj contains the queried contents. Can uncomment below to test
			//console.log(obj); 
			db.close();
		
		});
	}

});
