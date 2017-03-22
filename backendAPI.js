/* jshint esversion : 6*/

var express = require("express");
var mongoOP = require("mongoConnect");
var app = express();
var bodyParser = require("body-parser");
var router = express.Router();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({"extended" : false}));

router.get("/", function(req, res){
	res.json({"error" : false, "message" : "Hello World"});
});

router.route("/users")
	.get(function (req, res){
		var response = {};

		mongoOP.find({/* SEARCH PARAM */}, function(err, data){
			if(err){
				response = {"error" : true, "message" : "ERROR FETCHING DATA"};
			} else {
				response = {"error" : false, "message" : data};
			}

			res.json(response);
		});
	});

router.route("/teams")
	.get(function (req, res){
		var response = {};

		mongoOP.find({/* SEARCH PARAM */}, function(err, data){
			if(err){
				response = {"error" : true, "message" : "ERROR FETCHING DATA"};
			} else {
				response = {"error" : false, "message" : data};
			}

			res.json(response);
		});
	});


app.use('/', router);

app.listen(3000);
console.log("Listening on PORT 3000");