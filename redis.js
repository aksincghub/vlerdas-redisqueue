
var redis = require("redis");
var logger = require('winston');
var _ = require('underscore');
var CryptoJS = require("crypto-js");

var RedisQueue = function (options, callback) {
    var _self = this;
    options.port = options.port || 6379;
    options.host = options.host || 'localhost';
    options.processingChannel = options.processingChannel || options.channel + '.p';

    logger.debug('Creating Redis Client ', options);
    var client = redis.createClient(options.port, options.host);
    logger.debug('Authenticating Redis with ' + options.auth);
    client.auth(options.auth, function (err) {
        if (err) {
            logger.error('Could not authenticate ' + options.host + ':' + options.port, err);
            throw err;
        }
        logger.info('Authenticated ' + options.host + ':' + options.port);
        // Start the process
        logger.info('Redis Listening to ' + options.channel);
        logger.debug('Popping Data from ' + options.channel + ' into ' + options.processingChannel + ' with timeout ' + options.timeout);
        client.brpoplpush(options.channel, options.processingChannel || options.channel + '.p', options.timeout, onNotify);
        logger.info('Listening on Redis Channel-' + options.host + ':' + options.port);

        function onNotify(err, evt) {
            if (err) {
                // Stop execution on error.
                logger.error("Received error", err);
                throw err;
            }
			
			var object;
            logger.debug("Evicted from Queue:" + evt);
            if (!_.isUndefined(options.encryption) && options.encryption.enabled && !_.isUndefined(evt) && !_.isEmpty(evt)) {
                logger.debug("Decrypting Event..");
                var decrypted = CryptoJS.AES.decrypt(evt, options.encryption.passPhrase, {
                        format : JsonFormatter
                    });
                logger.debug("Decrypted Event:" + " Event: " + decrypted);
                object = decrypted.toString(CryptoJS.enc.Utf8)
                    logger.debug("Decrypted String:" + " Event: " + object);
            } else {
                object = evt;
            }

            callback(object, err, function (err) {
                if (err) {
                    logger.error('Error occured, possible elements in processing queue ', err, evt);
                } else {
                    logger.info('Removing Event from Redis Processing Channel-' + options.host + ':' + options.port, options.processingChannel);
                    client.lrem(options.processingChannel, 1, evt);
                }
                logger.debug('Popping Data from ' + options.channel + ' into ' + options.processingChannel + ' with timeout ' + options.timeout);
                client.brpoplpush(options.channel, options.processingChannel, options.timeout, onNotify);
            })
        };
    });
}

var JsonFormatter = {
    stringify : function (cipherParams) {
        // create json object with ciphertext
        var jsonObj = {
            ct : cipherParams.ciphertext.toString(CryptoJS.enc.Base64)
        };

        // optionally add iv and salt
        if (cipherParams.iv) {
            jsonObj.iv = cipherParams.iv.toString();
        }
        if (cipherParams.salt) {
            jsonObj.s = cipherParams.salt.toString();
        }

        // stringify json object
        return JSON.stringify(jsonObj);
    },

    parse : function (jsonStr) {
        // parse json string
        var jsonObj = JSON.parse(jsonStr);

        // extract ciphertext from json object, and create cipher params object
        var cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext : CryptoJS.enc.Base64.parse(jsonObj.ct)
            });

        // optionally extract iv and salt
        if (jsonObj.iv) {
            cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv)
        }
        if (jsonObj.s) {
            cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s)
        }

        return cipherParams;
    }
};

module.exports = RedisQueue;
