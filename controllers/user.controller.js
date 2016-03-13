'use strict';

var jsonfile = require('jsonfile'),
    uuid = require('node-uuid'),
    formidable = require('formidable'),
    validator = require('validator'),
    fs = require('fs-extra');

var users_json_path = global.__base_data + '/users.json';
var access_token_json_path = global.__base_data + '/accessTokens.json';

var default_image_profile_name = 'default_image_profile.png';


var _getUsersFromJsonFile = function () {
    return jsonfile.readFileSync(users_json_path);
};


var _getAccessTokensFromJsonFile = function () {
    return jsonfile.readFileSync(access_token_json_path);
};

var _getUserProfileInJson = function (user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: global.__media_end_point + user.image //like http://192.168.1.100:8081/image_profile/default_image_profile.png
    }
};

/**
 * export the private function used in tweet controller
 * @type {Function}
 */
exports.getUserProfileJson = _getUserProfileInJson;

/**
 * get random expire time
 * @returns {{expire_at: Date, expire_in_sec: number}}
 * @private
 */
var _getRandomExpireDateTime = function () {
    var expire_at = new Date();
    var expire_in_minute = Math.floor(Math.random() * (2880 - 20 + 1)) + 1;
    expire_at.setMinutes(expire_at.getMinutes() + expire_in_minute);
    return {expire_at: expire_at, expire_in_sec: expire_in_minute * 60};
};

/**
 * create new access token
 * @private
 */
var _createNewAccessToken = function (user_id, app_id, expire_at, access_token, Callback) {
    var accessTokens = _getAccessTokensFromJsonFile();
    var newAccessToken = {user_id: user_id, app_id: app_id, expire_at: expire_at, access_token: access_token};
    accessTokens.push(newAccessToken);
    jsonfile.writeFile(access_token_json_path, accessTokens, Callback);
};

/**
 * this is middleware for when user should authorized such as post new tweet || update the user profile
 */
exports.apiRequestAuthorization = function (req, res, next) {
    var accessTokenFromHeader = req.get('Authorization');
    if (accessTokenFromHeader) {
        accessTokenFromHeader = accessTokenFromHeader.replace(/Bearer /ig, '');
        //check is valid accessToken or not
        var accessTokens = _getAccessTokensFromJsonFile();
        var found_access_token;
        accessTokens.forEach(function (accessToken) {
            if (accessToken.access_token === accessTokenFromHeader) {
                found_access_token = accessToken;
            }
        });
        if (found_access_token) {
            //get user information that have this accessToken
            var users = _getUsersFromJsonFile();
            users.forEach(function (user) {
                if (user.id === found_access_token.user_id) {
                    req.user = user;
                    req.app_id = found_access_token.app_id;
                    next();
                }
            });
        }
        else {
            res.status(401).send({
                type: 'ACCESS_TOKEN_IS_NOT_VALID',
                description: 'Access token is not valid'
            });
        }
    }
    else {
        res.status(401).send({
            type: 'ACCESS_TOKEN_IS_NOT_VALID',
            description: 'Access token is not valid'
        });
    }
};

/**
 * removed all of the user access token just for test refresh token request
 * @param req
 * @param res
 */
exports.removeAllUserAccessToken = function (req, res) {
    var user_id = req.user.id;
    var result_of_indexs = [];
    var accessTokens = _getAccessTokensFromJsonFile();
    accessTokens.forEach(function (accessToken, index) {
        if (accessToken.user_id === user_id) {
            result_of_indexs.push(index);
        }
    });
    result_of_indexs.forEach(function (index) {
        accessTokens.splice(index, 1);
    });
    //save the access Token to json file
    jsonfile.writeFile(access_token_json_path, accessTokens, function (err) {
        if (err) {
            res.status(500).send({
                type: 'INTERNAL_SERVER_ERROR',
                description: 'Internal server error'
            });
        }
        else {
            //inform user that all of the access token removed successfully
            res.send({
                type: 'REMOVED_SUCCESSFULLY', description: 'Removed successfully'
            });
        }
    });
};

/**
 * terminate trusted app when user logout
 */
exports.terminateTrustedApp = function (req, res) {
    var user = req.user;
    var app_id = req.app_id;
    var users = _getUsersFromJsonFile();
    if (users) {
        var found_user_index = -1;
        var found_trusted_app_index = -1;
        users.forEach(function (u, user_index) {
            if (u.id === user.id) {
                found_user_index = user_index;
                u.trusted_apps.forEach(function (trusted_app, trusted_app_index) {
                    if (trusted_app.app_id === app_id) {
                        found_trusted_app_index = trusted_app_index;
                    }
                });
            }
        });
        users[found_user_index].trusted_apps.splice(found_trusted_app_index, 1);
        //save this users in json file
        jsonfile.writeFile(users_json_path, users, function (err) {
            if (err) {
                res.status(500).send({
                    type: 'INTERNAL_SERVER_ERROR',
                    description: 'Internal server error'
                });
            }
            else {
                //remove all accessTokens via this user and this app_id
                var accessTokens = _getAccessTokensFromJsonFile();
                if (accessTokens) {
                    var access_token_index_list = [];
                    accessTokens.forEach(function (token, index) {
                        if (token.user_id === user.id && token.app_id === app_id) {
                            access_token_index_list.push(index);
                        }
                    });
                    if (access_token_index_list.length > 0) {
                        //so should remove these accesstokens
                        access_token_index_list.forEach(function (index) {
                            accessTokens.splice(index, 1);
                        });
                        //save this access token to json file
                        jsonfile.writeFile(access_token_json_path, accessTokens, function (err) {
                            if (err) {
                                res.status(500).send({
                                    type: 'INTERNAL_SERVER_ERROR',
                                    description: 'Internal server error'
                                });
                            }
                            else {
                                res.send({
                                    type: 'TERMINATE_SUCCESSFULLY',
                                    description: 'application terminate successfully'
                                });
                            }
                        });
                    }
                }
                else {
                    //can not read the access token json file
                    res.status(500).send({
                        type: 'INTERNAL_SERVER_ERROR',
                        description: 'Internal server error'
                    });
                }
            }
        });
    }
    else {
        res.status(500).send({
            type: 'INTERNAL_SERVER_ERROR',
            description: 'Internal server error'
        });
    }
};

/**
 * refresh the access token
 * this request have client information and should authorized first then if have correct refresh token generate new access token
 */
exports.refreshToken = function (req, res) {
    var clientId = req.body.client_id;
    var refreshToken = req.body.refresh_token;
    var found_user_index = -1;
    var found_trusted_app_index = -1;
    var users = _getUsersFromJsonFile();
    users.forEach(function (user, user_index) {
        user.trusted_apps.forEach(function (trusted_app, trusted_app_index) {
            if (trusted_app.refresh_token === refreshToken) {
                found_user_index = user_index;
                found_trusted_app_index = trusted_app_index;
            }
        });
    });
    if (found_user_index !== -1 && found_trusted_app_index !== -1) {
        //that mean this refresh token is valid
        var refresh_token = uuid.v4();
        var access_token = uuid.v4();
        var random_expire_token = _getRandomExpireDateTime();
        users[found_user_index].trusted_apps[found_trusted_app_index].refresh_token = refresh_token;
        users[found_user_index].trusted_apps[found_trusted_app_index].access_token = access_token;
        users[found_user_index].trusted_apps[found_trusted_app_index].last_refresh_token_date = new Date();
        _createNewAccessToken(users[found_user_index].id, users[found_user_index].trusted_apps[found_trusted_app_index].app_id, random_expire_token.expire_at, access_token, function (err) {
            if (err) {
                res.status(500).send({
                    type: 'INTERNAL_SERVER_ERROR',
                    description: 'Internal server error'
                });
            }
            else {
                //store user information to json file
                jsonfile.writeFile(users_json_path, users, function (err) {
                    if (err) {
                        res.status(500).send({
                            type: 'INTERNAL_SERVER_ERROR',
                            description: 'Internal server error'
                        });
                    }
                    else {
                        //return the access Token and information about user profile
                        res.json({
                            access_token: access_token,
                            expire_in_sec: random_expire_token.expire_in_sec,
                            expire_at: random_expire_token.expire_at,
                            refresh_token: refresh_token,
                            app_id: users[found_user_index].trusted_apps[found_trusted_app_index].app_id
                        });
                    }
                });
            }
        });
    }
    else {
        res.status(403).send({
            type: 'INVALID_REFRESH_TOKEN',
            description: 'Invalid refresh token'
        });

    }
};

/**
 * sign up new user
 * @param req request
 * @param res response
 */
exports.signUpNewUser = function (req, res) {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    var client_id = req.body.client_id;
    if (name && email && password) {
        //first check email has valid format
        if (validator.isEmail(email)) {
            //now check is email unique in users
            var users = _getUsersFromJsonFile();
            if (users) {
                var found_it = false;
                users.forEach(function (user) {
                    if (user.email === email.toLowerCase()) {
                        found_it = true;
                    }
                });
                if (found_it) {
                    res.status(400).send({
                        type: 'USER_ALREADY_REGISTERED',
                        description: 'user already registered with this email address'
                    });
                }
                else {
                    //now add this user to json file and assign the accessToken to this request
                    var newUser = {
                        id: uuid.v1(),
                        name: name,
                        image: default_image_profile_name,
                        email: email.toLowerCase(),
                        password: password, //never store clear password, this is just for test :) !
                        trusted_apps: []
                    };
                    var new_app_id = uuid.v1();
                    var refresh_token = uuid.v4();
                    var access_token = uuid.v4();
                    var random_expire_token = _getRandomExpireDateTime();
                    newUser.trusted_apps.push({
                        app_id: new_app_id,
                        client_id: client_id,
                        refresh_token: refresh_token,
                        last_refresh_token_date: new Date(),
                        trusted_at: new Date()
                    });
                    _createNewAccessToken(newUser.id, new_app_id, random_expire_token.expire_at, access_token, function (err) {
                        if (err) {
                            res.status(500).send({
                                type: 'INTERNAL_SERVER_ERROR',
                                description: 'Internal server error'
                            });
                        }
                        else {
                            //store this user in file
                            users.push(newUser);
                            jsonfile.writeFile(users_json_path, users, function (err) {
                                if (err) {
                                    res.status(500).send({
                                        type: 'INTERNAL_SERVER_ERROR',
                                        description: 'Internal server error'
                                    });
                                }
                                else {
                                    //assign the user to request user object
                                    res.user = newUser;
                                    //return the access Token and information about user profile
                                    res.json({
                                        token: {
                                            access_token: access_token,
                                            expire_in_sec: random_expire_token.expire_in_sec,
                                            expire_at: random_expire_token.expire_at,
                                            refresh_token: refresh_token,
                                            app_id: new_app_id
                                        },
                                        user_profile: _getUserProfileInJson(newUser)
                                    });
                                }
                            });
                        }
                    });
                }
            }
            else {
                //error happened in get list of users from json file
                res.status(500).send({
                    type: 'INTERNAL_SERVER_ERROR',
                    description: 'Internal server error'
                });
            }
        }
        else {
            res.status(400).send({
                type: 'EMAIL_IS_NOT_VALID',
                description: 'email address is not valid format'
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
 * sign in user with email & password
 * @param req
 * @param res
 */
exports.signIn = function (req, res) {
    var email = req.body.email;
    var password = req.body.password;
    var client_id = req.body.client_id;
    if (email && password) {
        //first check email has valid format
        if (validator.isEmail(email)) {
            //now check is email unique in users
            var users = _getUsersFromJsonFile();
            var found_user;
            var user_index = -1;
            if (users) {
                users.forEach(function (user, index) {
                    if (user.email === email.toLowerCase() && user.password === password) {
                        found_user = user;
                        user_index = index;
                    }
                });
                if (found_user) {
                    //assign the access token to this user id
                    var new_app_id = uuid.v1();
                    var refresh_token = uuid.v4();
                    var access_token = uuid.v4();
                    var random_expire_token = _getRandomExpireDateTime();
                    found_user.trusted_apps.push({
                        app_id: new_app_id,
                        client_id: client_id,
                        refresh_token: refresh_token,
                        last_refresh_token_date: new Date(),
                        trusted_at: new Date()
                    });
                    _createNewAccessToken(found_user.id, new_app_id, random_expire_token.expire_at, access_token, function (err) {
                        if (err) {
                            res.status(500).send({
                                type: 'INTERNAL_SERVER_ERROR',
                                description: 'Internal server error'
                            });
                        }
                        else {
                            users[found_user] = found_user;
                            //store this user in file
                            jsonfile.writeFile(users_json_path, users, function (err) {
                                if (err) {
                                    res.status(500).send({
                                        type: 'INTERNAL_SERVER_ERROR',
                                        description: 'Internal server error'
                                    });
                                }
                                else {
                                    //assign the user to request user object
                                    res.user = found_user;
                                    //return the access Token and information about user profile
                                    res.json({
                                        token: {
                                            access_token: access_token,
                                            expire_in_sec: random_expire_token.expire_in_sec,
                                            expire_at: random_expire_token.expire_at,
                                            refresh_token: refresh_token,
                                            app_id: new_app_id
                                        },
                                        user_profile: _getUserProfileInJson(found_user)
                                    });
                                }
                            });
                        }
                    });
                }
                else {
                    res.status(403).send({
                        type: 'INVALID_EMAIL_OR_PASSWORD',
                        description: 'invalid information email or password'
                    });
                }
            }
            else {
                //error happened in get list of users from json file
                res.status(500).send({
                    type: 'INTERNAL_SERVER_ERROR',
                    description: 'Internal server error'
                });
            }
        }
        else {
            res.status(400).send({
                type: 'EMAIL_IS_NOT_VALID',
                description: 'email address is not valid format'
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
 * update user profile information such as name
 */
exports.updateUserProfile = function (req, res) {
    var user = req.user;
    var name = req.body.name;
    if (name) {
        user.name = name;
        //now should save it to file
        var found_user_index = -1;
        var users = _getUsersFromJsonFile();
        if (users) {
            users.forEach(function (u, index) {
                if (u.id === user.id) {
                    found_user_index = index;
                }
            });
            if (found_user_index !== -1) {
                //update the user object
                users[found_user_index] = user;
                jsonfile.writeFile(users_json_path, users, function (err) {
                    if (err) {
                        res.status(500).send({
                            type: 'INTERNAL_SERVER_ERROR',
                            description: 'Internal server error'
                        });
                    }
                    else {
                        res.json(_getUserProfileInJson(user));
                    }
                });
            }
            else {
                res.status(500).send({
                    type: 'INTERNAL_SERVER_ERROR',
                    description: 'Internal server error'
                });
            }
        }
        else {
            //error happened in get list of users from json file
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
 *
 * get uploaded image profile and save it to public/image_profile dir
 */
exports.updateImageProfile = function (req, res) {
    var user = req.user;
    var image_file_name = uuid.v1() + '.jpeg';
    var des_image_path = global.__base_image + '/' + image_file_name;
    var form = new formidable.IncomingForm();
    form.maxFilesSize = 4 * 1024 * 1024;
    form.uploadDir = global.__base_tmp_upload;
    form.type = true;
    form.parse(req);
    form.on('error', function () {
        res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
    });
    form.on('end', function (fields, files) {
        console.log('the fields are');
        console.log(fields);
        console.log('the files is ');
        console.log(files);
        var tmp_uploaded_file = this.openedFiles[0].path;

        //move the uploaded file to des
        fs.move(tmp_uploaded_file, des_image_path, function (err) {
            if (err) {
                res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
            }
            else {
                //save this image_file as image field for this user
                user.image = image_file_name;
                var users = _getUsersFromJsonFile();
                if (users) {
                    var found_user_index = -1;
                    users.forEach(function (u, index) {
                        if (u.id === user.id) {
                            found_user_index = index;
                        }
                    });
                    if (found_user_index !== -1) {
                        users[found_user_index] = user;
                        //save this
                        jsonfile.writeFile(users_json_path, users, function (err) {
                            if (err) {
                                res.status(500).send({
                                    type: 'INTERNAL_SERVER_ERROR',
                                    description: 'Internal server error'
                                });

                            }
                            else {
                                //change the user information in req
                                req.user = user;
                                res.json(_getUserProfileInJson(user));
                            }
                        });
                    }
                    else {
                        res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
                    }
                }
                else {
                    res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
                }
            }
        });
    });
};
