/**
 Latest edit: Troy Herbison on April 4
 */

 /* jshint esversion: 6 */

const url_db = 'mongodb://localhost:27017/folding';
var app = require('express')();
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var bodyParser = require('body-parser');
var async = require('async');
//var jsonConcat = require("json-concat");

// Use connect method to connect to the Server
MongoClient.connect(url_db, function(err, db) {
  assert.equal(null, err);
  	
  	var obj;
  	var userOrTeam;
  	var limit;
  	var findField;

	//parse application/json for recieving post requests
	app.use(bodyParser.json());

  	//send response if user wants to sort by rank, score, units, or changes in these values
	app.get('/sort/:userOrTeam/:sortVal/:limit/:order/:pageNum', function(req, res) {
		userOrTeam = req.params.userOrTeam.toLowerCase();
    	limit = parseInt(req.params.limit);
		res.header('Access-Control-Allow-Origin', '*');
    	
		var sortBy = {};
		//sortBy[req.params.sortVal] = -1;
		sortBy[req.params.sortVal] = parseInt(req.params.order);
		var pageNum = parseInt(req.params.pageNum);

    	//calculate amount to skip to display a specified page
    	var skipAmt = limit * (pageNum - 1);

    	//query top teams or users on a page then send a response as an object
	    db.collection(userOrTeam).find().sort(sortBy).skip(skipAmt).limit(limit).toArray(function(err, obj) {
			if (err) return console.log(err.message);

			res.send(obj);
		});

    	
	});

	//send response if user wants to search for name, teamID, or rank
	app.get('/find/:userOrTeam/:findField/:findVal', function(req, res) {
		userOrTeam = req.params.userOrTeam;

		//findVal could be a name, teamID, or rank
		var findVal = req.params.findVal;
		findField = req.params.findField.toLowerCase();

		if(findField == "name")
		{
			//search for name and remove hourly and daily fields
	    	db.collection(userOrTeam).findOne({"_id.name" : findVal }, function(err, obj) {
				if (err) return console.log(err.message);
				
				res.send(obj);
			});
    	}
    	else if(findField == "teamid")
    	{
    		//search for teamID and remove hourly and daily fields
    		db.collection(userOrTeam).findOne({"_id.teamID" : findVal}, function(err, obj) {
				if (err) return console.log(err.message);
				
				res.send(obj);
			});
    	}
    	else if(findField == "rank")
    	{
    		//search for rank and remove hourly and daily fields
    		db.collection(userOrTeam).findOne({rank : parseInt(findVal)}, function(err, obj) {
				if (err) return console.log(err.message);
				
				res.send(obj);
			});
    	}

	});
	
	app.post('/post', function (req, res) {
  		
  		userOrTeam = String(req.body.type);
  		
  		var arr = req.body.names;
  		var arrToSend = [];

  		async.forEach(Object.keys(arr), function (item, callback){ 

    		db.collection(userOrTeam).findOne({"_id.name" : arr[item] }, function(err, obj) {
				if (err) return console.log(err.message);

				//add the newly queried object to the array
				arrToSend.push(obj);
					
    			// tell async that that particular element of the iterator is done
    			callback(); 
			});


		}, function(err) {
			//iterating done, first convert to JSON string before sending
			arrToSend = JSON.stringify(arrToSend);

    		//send the JSON string
    		res.send(arrToSend);
		}); 
  		
	});

	app.listen(3000, function (){
		console.log("Listening on port 3000");
	});
});