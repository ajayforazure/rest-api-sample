'use strict';

var jsonfile = require('jsonfile'),
    uuid = require('node-uuid'),
    userController = require('../controllers/user.controller.js');

var tweets_json_path = global.__base_data + '/tweets.json';

/**
 * helper functions for get data from json files
 * @returns {*} array of tweet from json file
 * @private
 */
var _getTweetsFromJsonFile = function () {
    return jsonfile.readFileSync(tweets_json_path);
};

/**
 * create new tweet from authorized user
 */
exports.createNewTweet = function (req, res) {
    var user = req.user;
    var body = req.body.body;
    var feel = req.body.feel;
    if (body && feel) {
        //create new tweet object
        var newTweet = {
            id: uuid.v1(),
            user: userController.getUserProfileJson(user),
            body: body,
            feel: feel,
            created_at: new Date(),
            updated_at: new Date()
        };
        //get the tweets list and add this new tweet to that list
        var tweets = _getTweetsFromJsonFile();
        if (tweets) {
            //add this tweet to tweet list
            tweets.push(newTweet);
            //write these tweet to json file
            jsonfile.writeFile(tweets_json_path, tweets, function (err) {
                if (err) {
                    res.status(500).send({
                        type: 'INTERNAL_SERVER_ERROR',
                        description: 'Internal server error'
                    });
                }
                else {
                    res.json(newTweet);
                }
            });
        }
        else {
            //error happened in get list of tweets from json file
            res.status(500).send({
                type: 'INTERNAL_SERVER_ERROR',
                description: 'Internal server error'
            });
        }
    }
    else {
        res.status(400).send({
            type: 'SOME_FIELDS_ARE_EMPTY',
            description: 'body field or feel field for create new tweet was empty :|'
        });
    }
};

/**
 * get tweet by id
 * @param req
 * @param res
 */
exports.getTweetById = function (req, res) {
    var tweet_with_this_id;
    var tweets = _getTweetsFromJsonFile();
    var tweet_id = req.params.id;
    tweets.forEach(function (tweet) {
        if (tweet.id === tweet_id) {
            tweet_with_this_id = tweet;
        }
    });
    if (tweet_with_this_id) {
        res.json(tweet_with_this_id);
    }
    else {
        res.status(404).send({
            type: 'NOT_FOUND_TWEET_WITH_THIS_ID',
            description: 'not found any tweet with this id'
        });
    }
};

/**
 * update the tweet by id
 * @param req
 * @param res
 */
exports.updateTweet = function (req, res) {
    var user = req.user;
    var user_id = user.id;
    var updated_tweet;
    var tweets = _getTweetsFromJsonFile();
    var tweet_id = req.params.id;
    var body = req.body.body;
    var feel = req.body.feel;
    if (body && feel) {
        tweets.forEach(function (tweet) {
            //check tweet id and also check user_id
            if (tweet.id === tweet_id && tweet.user.id === user_id) {
                //find it :) now should edit the fields
                tweet.user = userController.getUserProfileJson(user);
                tweet.body = body;
                tweet.feel = feel;
                tweet.updated_at = new Date();
                updated_tweet = tweet;
            }
        });
        if (updated_tweet) {
            //write it to json file
            jsonfile.writeFile(tweets_json_path, tweets, function (err) {
                if (err) {
                    res.status(500).send({
                        type: 'INTERNAL_SERVER_ERROR',
                        description: 'Internal server error'
                    });
                }
                else {
                    res.json(updated_tweet);
                }
            });
        }
        else {
            res.status(404).send({
                type: 'NOT_FOUND_TWEET_WITH_THIS_ID',
                description: 'not found any tweet with this id'
            });
        }
    }
    else {
        res.status(400).send({
            type: 'SOME_FIELDS_ARE_EMPTY',
            description: 'body field or feel field for create new tweet was empty :|'
        });
    }
};

/**
 * delete tweet by id
 */
exports.deleteTweetById = function (req, res) {
    var user = req.user;
    var user_id = user.id;
    //first should find it then remove it and write it to json file
    var tweet_index = -1;
    var tweets = _getTweetsFromJsonFile();
    var tweet_id = req.params.id;
    tweets.forEach(function (tweet, index) {
        //check tweet id matched also check is user have this tweet
        if (tweet.id === tweet_id && tweet.user.id === user_id) {
            tweet_index = index;
        }
    });
    if (tweet_index !== -1) {
        //remove it
        tweets.splice(tweet_index, 1);
        //write it to json file
        jsonfile.writeFile(tweets_json_path, tweets, function (err) {
            if (err) {
                res.status(500).send({
                    type: 'INTERNAL_SERVER_ERROR',
                    description: 'Internal server error'
                });
            }
            else {
                //inform user this tweet successfully remove it
                res.send({
                    type: 'REMOVED_SUCCESSFULLY', description: 'Removed successfully'
                });
            }
        });
    }
    else {
        res.status(404).send({
            type: 'NOT_FOUND_TWEET_WITH_THIS_ID',
            description: 'not found any tweet with this id'
        });
    }
};

/**
 * get list of tweets
 * can filter by feel query string
 */
exports.getListOfTweets = function (req, res) {
    var tweets = _getTweetsFromJsonFile();
    if (tweets) {
        //filter if have query string feel
        var wanted_feel = req.query.feel;
        if (wanted_feel) {
            var result = [];
            //filter with this feel
            tweets.forEach(function (tweet) {
                if (tweet.feel === wanted_feel) {
                    result.push(tweet);
                }
            });
            res.json(result.reverse());
        }
        else {
            res.json(tweets.reverse());
        }
    }
    else {
        res.status(500).send({
            type: 'INTERNAL_SERVER_ERROR',
            description: 'Internal server error'
        });
    }
};