'use strict';

var jsonfile = require('jsonfile'),
    uuid = require('node-uuid'),
    crypto = require('crypto');


var client_json_path = global.__base_data + '/clients.json';

var _getClientsFromJsonFile = function () {
    return jsonfile.readFileSync(client_json_path);
};


var _getHashedClientKey = function (clientKey) {
    return crypto.createHash('md5').update(clientKey).digest('hex');
};


/**
 * create new client with this name
 * @param req
 * @param res
 */
exports.createNewClient = function (req, res) {
    var client_name = req.body.name;
    if (client_name) {
        var client_id = uuid.v1();
        var client_key = crypto.randomBytes(20).toString('hex');
        var newClient = {id: client_id, key: client_key, name: client_name};
        var clients = _getClientsFromJsonFile();
        if (clients) {
            //save this client to json file
            clients.push(newClient);
            jsonfile.writeFile(client_json_path, clients, function (err) {
                if (err) {
                    res.status(500).send({
                        type: 'INTERNAL_SERVER_ERROR',
                        description: 'Internal server error'
                    });
                }
                else {
                    //assign hashed key to client
                    newClient.key = _getHashedClientKey(client_key);
                    res.json(newClient);
                }
            });
        }
        else {
            //error happened in get list of clients from json file
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
 * check have valid client information client_id and client_key
 * used in sign up , sign in & refresh token request
 */
exports.hasAuthorizeToAPI = function (req, res, next) {
    var clientId = req.body.client_id;
    var clientKey = req.body.client_key;
    if (clientId && clientKey) {
        var clients = _getClientsFromJsonFile();
        clients.forEach(function (client) {
            if (client.id === clientId) {
                if (crypto.createHash('md5').update(client.key).digest('hex') === clientKey) {
                    next();
                }
                else {
                    res.status(403).send({
                        type: 'CLIENT_INFORMATION_IS_NOT_VALID',
                        description: 'client information is not valid :|'
                    });
                }
            }
        });
    }
    else {
        res.status(400).send({
            type: 'SOME_FIELDS_ARE_EMPTY',
            description: 'body field or feel field for create new tweet was empty :|'
        });
    }
};