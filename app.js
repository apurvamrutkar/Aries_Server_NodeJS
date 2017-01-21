var express = require('express');

var app = express();
var multer = require('multer')



var port = process.env.PORT || 8042;
var mongoose = require('mongoose');

var path = require('path');


var bodyParser = require('body-parser');

var dateFormat = require('dateformat');
var now = new Date();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


/***************Mongodb configuratrion********************/
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
var configDB = require('./config/database.js');
mongoose.Promise = global.Promise;
//configuration ===============================================================
var connection = mongoose.connect(configDB.url); // connect to our database
autoIncrement.initialize(connection);

app.use(bodyParser()); // get information from html forms


// routes ======================================================================
require('./config/routes.js')(app); // load our routes and pass in our app and fully configured passport

//launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);

exports = module.exports = app;