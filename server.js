'use strict';
/*
 Module dependencies
 */
var express = require('express'),
    morgan = require('morgan'),
    path = require('path'),
    jsonfile = require('jsonfile'),
    bodyParser = require('body-parser'),
    uuid = require('node-uuid'),
    app = express();

global.__base_data = path.resolve('./data');

global.__base_image = path.resolve('./public/image_profile');
global.__base_tmp_upload = path.resolve('./public/tmp_upload');
//TODO : should change localhost with the server ip address
global.__media_end_point = 'http://localhost:8081/image_profile/';


/**
 * after assign value into global require these controller
 */
var clientController = require('./controllers/client.controller.js'),
    userController = require('./controllers/user.controller.js'),
    tweetController = require('./controllers/tweet.controller.js');

//config express js
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

//use from morgan to logging these request into console
app.use(morgan('combined'));

//server static files
app.use(express.static('public'));

//REST FULL API Routes

var prefix_api = "/api/v1";

//client endpoint
//NOTE : this is just for test anyone can create client ,
// in real production only admins or authorized user can create new client !
app.post(prefix_api + '/client', clientController.createNewClient);

//users endpoint
app.post(prefix_api + '/signup', clientController.hasAuthorizeToAPI, userController.signUpNewUser);
app.post(prefix_api + '/signin', clientController.hasAuthorizeToAPI, userController.signIn);
app.post(prefix_api + '/refreshtoken', clientController.hasAuthorizeToAPI, userController.refreshToken);
app.put(prefix_api + '/user/profile', userController.apiRequestAuthorization, userController.updateUserProfile);
app.post(prefix_api + '/user/profile/image', userController.apiRequestAuthorization, userController.updateImageProfile);
app.delete(prefix_api + '/user/app', userController.apiRequestAuthorization, userController.terminateTrustedApp);

//NOTE : this is just for test for demonstrate refresh token in authentication mechanism ,
//in real production the accessToken has TTL and automatically expire in database
app.delete(prefix_api + '/tokens', userController.apiRequestAuthorization, userController.removeAllUserAccessToken);

//tweets endpoint
app.get(prefix_api + '/tweet', userController.apiRequestAuthorization, tweetController.getListOfTweets);
app.post(prefix_api + '/tweet', userController.apiRequestAuthorization, tweetController.createNewTweet);
app.get(prefix_api + '/tweet/:id', userController.apiRequestAuthorization, tweetController.getTweetById);
app.put(prefix_api + '/tweet/:id', userController.apiRequestAuthorization, tweetController.updateTweet);
app.delete(prefix_api + '/tweet/:id', userController.apiRequestAuthorization, tweetController.deleteTweetById);

var server = app.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;
    host = host === '::' ? 'localhost' : host;
    console.log("sample REST API for Retrofit in android without Authentication is running at http://%s:%s", host, port);
});
