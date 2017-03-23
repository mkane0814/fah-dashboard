/**
 Latest edit: Grayson Dubois on March 22
 */
 /*jshint esversion: 6*/
const http = require("http");
const express = require("express");
const child_process = require("child_process");
const MongoClient = require("mongodb").MongoClient;

// Fork a separate process to handle the data download and parsing
var downloadTask = child_process.exec("node app14.js", function(error, stdout, stderr) {
	if (error) {
		console.log(error.stack);
		console.log("Error code: " + error.code);
		console.log("Signal recieved: " + error.signal);
		console.log("app14.js stderr: " + stderr);
	}
	if (stdout) {
		console.log("app14.js stdout: " + stdout);
	}
});

downloadTask.on("exit", function(exitCode) {
	console.log("app14.js exited with code " + exitCode);
});
