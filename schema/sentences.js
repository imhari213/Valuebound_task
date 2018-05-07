
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/hariprasad';
module.exports.init = function(){
    MongoClient.connect(url, function(err, db){
        if(!err){
            console.log('mongodb connected');
        }
        module.exports.db = db;
    });
};
