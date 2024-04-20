var express = require("express");
var authRouter = require("./auth");
var carlistingRouter = require("./carlisting");

var app = express();

app.use("/auth/", authRouter);
app.use("/carlisting/", carlistingRouter);

module.exports = app;
