
var RedisQueue = require('redisqueue')

var options = {
    "host" : "127.0.0.1",
    "port" : "6379",
    "auth" : "pass1",
    "channel" : "core.lens.serviceTreatmentRecords",
    "processingChannel" : "core.lens.serviceTreatmentRecords.p",
    "timeout" : 0,
    "encryption" : {
        "enabled" : true,
        "passPhrase" : "v4aV%ca36lil14P9DO1eZke3odyzOSQEy?cv?d.ur#s*z6K*r4eo2rmUZu4m0yph"
    }
}
new RedisQueue(options, function (data, err, callback) {
    if (err)
        callback(new Error("Test Error"));
    else {
        callback();
    }
});
