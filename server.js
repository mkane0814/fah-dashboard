/**
 Latest edit: Troy Herbison on March 28
 */

const url_db = 'mongodb://localhost:27017/folding';
const url_team = 'http://fah-web.stanford.edu/daily_team_summary.txt';
const http = require('http');
var Vue = require('vue');
var VueResource = require('vue-resource');

Vue.use(VueResource);
/*const app = require('express')()
 
const vjmServer = require('vue-jwt-mongo').Server({
  mongoUrl: url_db,
  jwtSecret: 'shhh'
})
 
app.post('/auth/register', vjmServer.registerHandler)
app.post('/auth/login', vjmServer.loginHandler)
app.post('/auth/refresh', vjmServer.refreshHandler)
app.get('/protected', vjmServer.jwtProtector, (request, response) => {
    console.log(request.user.username)
    })
*/

//{
	//http.get(url_team, function(res) {
  // GET /someUrl 
 /* VueResource.http.get(url_db, function(res) {
  	console.log("pinged db");
  */

  /*new Vue({
  	data: {
		_id : { name : 'string', teamID : 'string' },
		rank : int,
		score : int,
		units : int,
		rankChange : int,
		scoreChange : int,
		unitsChange : int,
		date : Date,
		hourly : [
			{
				rank : int,
				score : int,
				units : int,
				date : Date 
			}
		],
		daily : [
			{
				rank : int,
				score : int,
				units : int,
				rankChange : int,
				scoreChange : int,
				unitsChange : int,
				date : Date
			}
		]
    },

    ready: function() {

        // GET request
        this.$http.get(url_db, function (data) {
            // set data on vm
            //this.$set('origin', data)

        }).error(function (data, status, request) {
            // handle error
        })

      }
})*/

/*process.on('unhandledRejection', (err, p) => {
  console.log('An unhandledRejection occurred');
  console.log(`Rejected Promise: ${p}`);
  console.log(`Rejection: ${err}`);
});*/


/*Vue.http.get(url_db, function(res){
	if (res.statusCode !== 200) {
		console.log('HTTP request for team data failed');
		return;
	}
/*
  //To print the parameters
  console.log(req.query.hdmi);
  console.log(req.query.resolution);

  //Remember to sanitize the query before passing it to db
  var query = {};
  if (req.query.resolution) query.resolution = req.query.resolution;
  if (req.query.resolution) query.hdmi = req.query.hdmi;

  db.displays.find(query, function(err, displays){
    if (err) {
      res.send(err);
    }
    else {
      return res.json(displays);
    }
  });*/

/*Vue.http.get(url_db, function(res, req){

	if(!res)
	{
		return;
	}

	if(!req)
	{
		return;
	}
});*/

 /*function yourExportedFunction() {
 	console.log("in func");
     var p = Vue.http.get(url_db).then(response => {

    // get body data
    this.someData = response.body;

  }, response => {
    // error callback
  });
     p.catch(() => {}); // add an empty catch handler
     return p;
 }

 yourExportedFunction();*/




//*********left off here and below
//working promise code if the url is http for example(url_team)
/*var somevar = false;
var PTest = function () {
    return Vue.http.get(url_team, function(resolve, reject) {
    if (somevar === true)
        resolve();
    else
        reject();
	});
}
var myfunc = PTest();
myfunc.then(function () {
     console.log("Promise Resolved");
}).catch(function () {
     console.log("Promise Rejected");
});*/



var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

// Use connect method to connect to the Server
MongoClient.connect(url_db, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server");

  //var obj = db.collection('users').find({_id : {name: 'FNP', teamID : '118560'}});

  var obj = db.collection('users').find().limit(100).sort({ "score" : -1 });

  console.log(obj);

  db.close();
});