/**
 Latest edit: Grayson Dubois on March 22
 */
const http = require("http");
const express = require("express");
const child_process = require("child_process");
const cron = require("node-cron");


// TODO: These are not being updated because the child script only has access to local copies
var lastDailyUserUpdate = new Date();
var lastDailyTeamUpdate = new Date();

var downloadUserTask;
var downloadTeamTask;

cron.schedule('21 * * * *', function() {
	downloadUserTask = child_process.exec("node UpdateUserData.js",
		{env: {lastDailyUserUpdate: lastDailyUserUpdate} },
		function(error, stdout, stderr) {
			if (error) {
				console.log("UpdateUserData.js Error Code: " + error.code);
				console.log("UpdateUserData.js Signal Received: " + error.signal);
			}
			if (stderr) console.log("UpdateUserData.js stderr: " + stderr);
			if (stdout) console.log("UpdateUserData.js stdout: " + stdout);
		});

	downloadUserTask.on("exit", function(exitCode) {
		console.log("UpdateUserData.js exited with code: " + exitCode);
	});

	downloadTeamTask = child_process.exec("node UpdateTeamData.js",
		{env: {lastDailyTeamUpdate: lastDailyTeamUpdate}},
		function(error, stdout, stderr) {
			if (error) {
				console.log("UpdateTeamData.js Error Code: " + error.code);
				console.log("UpdateTeamData.js Signal Recieved: " + error.signal);
			}
			if (stderr) console.log("UpdateTeamData.js stderr: " + stderr);
			if (stdout) console.log("UpdateTeamData.js stdout: " + stdout);
		});

	downloadTeamTask.on("exit", function(exitCode) {
		console.log("UpdateTeamData.js exited with code: " + exitCode);
	});
});
