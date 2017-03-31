/**
 Latest edit: Troy Herbison on March 30
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

  	//send response if user wants to sort by rank, score, units, or changes in these values
	app.get('/sort/:limit/:userOrTeam/:sortVal', function(req, res) {
		userOrTeam = req.params.userOrTeam;
    	limit = parseInt(req.params.limit);
    	
		var sortBy = req.params.sortVal;
    	
    	//query top teams or users then send a response as an object
    	db.collection(userOrTeam).find().limit(limit).sort({ sortBy : -1 }).toArray(function(err, obj) {
			if (err) return console.log(err.message);

			res.send(obj);
		});
	});

	//send response if user wants to search for name, teamID, or rank
	app.get('/find/:findVal/:findField/:userOrTeam', function(req, res) {
		userOrTeam = req.params.userOrTeam;

		//findVal could be a name, teamID, or rank
		var findVal = req.params.findVal;
		var findField = req.params.findField.toLowerCase();

		//should remove daily and hourly json fields before sending object here
		//delete obj["hourly"]; ***doesn't work

		if(findField == "name")
		{
			//search for name
	    	db.collection(userOrTeam).find({"_id.name" : findVal}).toArray(function(err, obj) {
				if (err) return console.log(err.message);
				
				res.send(obj);
			});
    	}
    	else if(findField == "teamid")
    	{
    		//search for teamID
    		db.collection(userOrTeam).find({"_id.teamID" : findVal}).toArray(function(err, obj) {
				if (err) return console.log(err.message);
				
				res.send(obj);
			});
    	}
    	else if(findField == "rank")
    	{
    		//search for rank
    		db.collection(userOrTeam).find({rank : parseInt(findVal)}).toArray(function(err, obj) {
				if (err) return console.log(err.message);
				
				res.send(obj);
			});
    	}

	});
	

	//var client = http.client();
	//client.get('/:limit/:userOrTeam', function (){ });

	app.listen(3000, function (){
		console.log("Listening on port 3000");
	});
});
