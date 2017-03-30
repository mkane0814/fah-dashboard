/**
 Latest edit: Grayson Dubois on March 22
 */
const http = require("http");
const express = require("express");
const child_process = require("child_process");
const cron = require("node-cron");


var lastDailyUserUpdate = new Date();
var lastDailyTeamUpdate = new Date();

var downloadUserTask;
var downloadTeamTask;

cron.schedule('0 * * * *', function() {

	// Set up the environment object with the dates that the child processes will need
	var env = {
		lastDailyUserUpdate: lastDailyUserUpdate,
		lastDailyTeamUpdate: lastDailyTeamUpdate
	};

	// Start the download user task on a child process
	downloadUserTask = child_process.exec("node --max-old-space-size=4096 UpdateUserData.js",
		{env: env },
		function(error, stdout, stderr) {
			if (error) {
				console.log("UpdateUserData.js Error Code: " + error.code);
				console.log("UpdateUserData.js Signal Received: " + error.signal);
			}
	});

	// Notify when download user task exits
	downloadUserTask.on("exit", function(exitCode) {
		console.log("UpdateUserData.js exited with code: " + exitCode);
	});

	// Port download user task stdout and stderr to the main console
	downloadUserTask.stdout.on("data", function(stdout) {
		// If the child process prints a message to change the date, then do so here
		if (stdout === "UPDATE DATE"){
            console.log('Daily update for teams complete');
            lastDailyUserUpdate = new Date(
                timeStamp.getFullYear(),
                timeStamp.getMonth(),
                timeStamp.getDate()
            );
		} else {
            console.log("UpdateUserData.js stdout: " + stdout);
		}
	});
	downloadUserTask.stderr.on("data", function(stderr) {
		console.log("UpdateUserData.js stderr: " + stderr);
	});

	// Start the download team task on a child process
	downloadTeamTask = child_process.exec("node --max-old-space-size=2048 UpdateTeamData.js",
		{env: {lastDailyTeamUpdate: lastDailyTeamUpdate}},
		function(error, stdout, stderr) {
			if (error) {
				console.log("UpdateTeamData.js Error Code: " + error.code);
				console.log("UpdateTeamData.js Signal Recieved: " + error.signal);
			}
	});

	// Notify when the download team task exits
	downloadTeamTask.on("exit", function(exitCode) {
		console.log("UpdateTeamData.js exited with code: " + exitCode);
	});

	// Port the download team task stdout and stderr to the main console
	downloadTeamTask.stdout.on('data', function(stdout) {
		// If the child process prints a message to update the date, then do so here
        if (stdout === "UPDATE DATE") {
            console.log('Daily update for teams complete');
            lastDailyTeamUpdate = new Date(
                timeStamp.getFullYear(),
                timeStamp.getMonth(),
                timeStamp.getDate()
            );
        } else {
            console.log("UpdateTeamData.js stdout: " + stdout);
		}
	});
	downloadTeamTask.stderr.on("data", function(stderr) {
		console.log("UpdateTeamData.js stderr: " + stderr);
	});
});
