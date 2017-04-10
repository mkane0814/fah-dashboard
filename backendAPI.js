/* jshint esversion : 6*/

var Vue = require("vue");
var vueRouter = require("vue-router");
var vueResource = require("vue-resource");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var express = require("express");
var app = express();
var router = express.Router();


mongoose.connect("mongodb://localhost:27017/userTestDB");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({"extended" : false}));

router.get("/", function(req, res){
	res.json({"error" : false, "message" : "Hello World"});
});


function getReqUser(params)
{
	router.route("/users")
		.get(function (req, res){
			var response = {};

			mongoose.find({params}, function(err, data){
				if(err){
					response = {"error" : true, "message" : "ERROR FETCHING DATA"};
				} else {
					response = {"error" : false, "message" : data};
				}

				res.json(response);
		});
	});
}

function getReqTeam(params){
router.route("/teams")
	.get(function (req, res){
		var response = {};

		mongoose.find({/* SEARCH PARAM */}, function(err, data){
			if(err){
				response = {"error" : true, "message" : "ERROR FETCHING DATA"};
			} else {
				response = {"error" : false, "message" : data};
			}

			res.json(response);
		});
	});

}

var Teams = {
	template: "<div>/teams</div>"
};
var Users = {
	template: `
		<div class="users">
			<h2>User {{route.params.id}}</h2>
			<router-view></router-view>
		</div>
	`

};

var vrouter = new vueRouter({
	routes: [
		{ path : "/users/:id", component: Users,
		children: [
			{
				path: 'userview',
				component: UserView
			},

		]},
		{ path : "/teams/:id", component: Teams,
		children: [
			{
				path: 'teamview',
				component: TeamView
			}
		]}
	]
});

var vm = new Vue({
	template: "#test"
	methods: {
		teamQuery: function(params){
			getReqTeam(params);
		}

		userQuery: function(params){
			getReqUser(params);
		}
	}
	data: {
		userData: {},
		teamData: {}
	}
	computed

	
});