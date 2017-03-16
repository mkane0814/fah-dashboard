/**
 Latest edit : Matt Kane March 16 at 4:44 pm
 */
 /*jshint esversion: 6*/
const cron = require("node-cron");
const http = require("http");
const fs = require("fs");
const MongoClient = require("mongodb").MongoClient;
const Stream = require("stream");
const readline = require("readline");
const url = "http://fah-web.stanford.edu/daily_user_summary.txt";
const dlDIR = "./DataFiles/";

let versionNumber = 0;

// Checking if there is a DataFiles directory.
// If not then create one.
fs.stat(dlDIR, function (err){
    if(err) {
        console.log("DataFiles directory does not exist. Creating " + dlDIR);
        fs.mkdir(dlDIR);
    }
});

function job() {
    //Connect to the Mongo Database
    MongoClient.connect("mongodb://localhost:27017/userDBTest", function (err, db) {
        if (err) return console.dir(err);
        console.log("We are connected");

        let collection = db.collection('data');
        console.log("Downloading Data...");

        // Create the filestream before making the http request
        let file = fs.createWriteStream(dlDIR +"downloaded-file-" + versionNumber +".txt");

        // Download data
        let request = http.get(url, function(response) {
            if (response.statusCode === 200) {
                response.pipe(file);
                
                file.on("finish", function() {
                    file.close();
                    console.log("Successfully downloaded file");

                    //Import to Test DB
                    let instream = fs.createReadStream(dlDIR +"downloaded-file-" + versionNumber +".txt");
                    let outstream = new Stream();
                    let date;
                    let rl = readline.createInterface(instream, outstream);
    
                    //Get the timestamp from the first line of the data file
                    rl.once("line", function (line) {
                        date = line;
                    });
        
                     // One thing I forgot, the way it is now the first line that is read by this function gets junk.
                    // Not sure how to skip that one line.
                    rl.on("line", function(line) {
                        //console.log(line);
                        let stringArr = line.split("\t");
                        collection.insert({timeStamp : date, name: stringArr[0], newCredits : stringArr[1], sumTotal : stringArr[2], team : stringArr[3]}, {w: 1});
                    });
 
                   rl.on("close", function () {
                        versionNumber++;
                    });
                });

            }

            request.setTimeout(12000, function() {
                console.log("Failed to download data: connection timed out");
                request.abort();
            });
        }).on("error", function(err) {
            console.log("Error making http request: " + err);
        }); 

	    //Import data to json objects
        /*let instream = fs.createReadStream(dlDIR +"downloaded-file-" + versionNumber +".txt");
        let outstream = new Stream();
        let date;
        let rl = readline.createInterface(instream, outstream);
    
	    //Get the timestamp from the first line of the data file
        rl.once("line", function (line) {
            date = line;
        });
    
	    // One thing I forgot, the way it is now the first line that is read by this function gets junk.
        // Not sure how to skip that one line.
        rl.on("line", function(line) {
            console.log(line);
            let stringArr = line.split("\t");
            collection.insert({timeStamp : date, name: stringArr[0], newCredits : stringArr[1], sumTotal : stringArr[2], team : stringArr[3]}, {w: 1});
        });
 
       rl.on("close", function () {
            versionNumber++;
        });*/
    });
}

job();

//call the job on the 0th minute of every hour
/*cron.schedule('0 * * * *', function() {
    // Call the job
    job();
});*/
