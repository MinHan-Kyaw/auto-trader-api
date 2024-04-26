var express = require("express");
var path = require("path");
require("dotenv").config();
var cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");

var apiRouter = require("./routes/api");
var apiResponse = require("./helpers/apiResponse");

// DB connection
var MONGODB_URL = process.env.MONGODB_URL;
var mongoose = require("mongoose");
mongoose
  .connect(MONGODB_URL)
  .then(() => {
    //don't show the log when it is test
    if (process.env.NODE_ENV !== "test") {
      console.log("Connected to %s", MONGODB_URL);
      console.log("App is running ... \n");
      console.log("Press CTRL + C to stop the process. \n");
    }
  })
  .catch((err) => {
    console.error("App starting error:", err.message);
    process.exit(1);
  });
var db = mongoose.connection;

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, "/dist")));

// To remove data using these defaults:
app.use(mongoSanitize());

//To allow cross-origin requests
app.use(cors());

app.get("/", function (req, res) {
  res.send("Hello, world!"); // Send a simple response without rendering a view
});

// Route Handlers
app.use("/api/", apiRouter);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.use((err, req, res) => {
  if (err.name == "UnauthorizedError") {
    return apiResponse.unauthorizedResponse(res, err.message);
  }
});

module.exports = app;
