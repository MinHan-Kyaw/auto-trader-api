var express = require("express");
require("dotenv").config();
var indexRouter = require("./routes/index");
var apiResponse = require("./helpers/apiResponse");
var cors = require("cors");

// DB connection
var MONGODB_URL = process.env.MONGODB_URL;
var mongoose = require("mongoose");
mongoose.connect(MONGODB_URL).then(() => {
	//don't show the log when it is test
	if(process.env.NODE_ENV !== "test") {
		console.log("Connected to %s", MONGODB_URL);
		console.log("App is running ... \n");
		console.log("Press CTRL + C to stop the process. \n");
	}
})
	.catch(err => {
		console.error("App starting error:", err.message);
		process.exit(1);
	});
var db = mongoose.connection;

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//To allow cross-origin requests
app.use(cors());

//Route Prefixes
app.use("/", indexRouter);

// throw 404 if URL not found
app.all("*", function(req, res) {
	return apiResponse.notFoundResponse(res, "Page not found");
});

app.use((err, req, res) => {
	if(err.name == "UnauthorizedError"){
		return apiResponse.unauthorizedResponse(res, err.message);
	}
});

module.exports = app;
