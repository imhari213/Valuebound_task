const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const readline = require('readline');
const htmlparser = require("htmlparser");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const google = require('googleapis');
const OAuth2Client = google.google.auth.OAuth2;
const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = 'credentials.json';
//var db = require('./schema/sentences');
 var arr = [];
let values = [];
var url = "mongodb://localhost:27017/hariprasad";
var MongoClient = require('mongodb').MongoClient;




app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: false }));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

fs.readFile('client_secret.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), listFiles);
});

function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.web;
  var oAuth2Client = new OAuth2Client(client_id, client_secret, 'http://localhost:3000/');

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, function(err, val) {
      if (err) {
        console.log('ERROR: invalid code');
        process.exit(0);
      } else {
        callback(val);
      }  
    });
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err, null);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(null, oAuth2Client);
    });
  });
}

function listFiles(auth) {
  const drive = google.google.drive({version: 'v3', auth});
  drive.files.list({
    pageSize: 10,
    fields: 'nextPageToken, files(id, name)',
  }, (err, {data}) => {
    if (err) return console.log('The API returned an error: ' + err);
    const files = data.files;
    if (files.length) {
      console.log('Files:');
      files.map((file) => {
        console.log(`${file.name} (${file.id})`);
      });
      rl.question('Enter the required doc file id here: ', (id) => {
        rl.close();
        readDocFile(auth, id);
      });
    } else {
      console.log('No files found.');
    }
  });
}

function readDocFile(auth, fileId) {
   MongoClient.connect("mongodb://localhost:27017/hariprasad", function(err, dbs) {
          if(err){
            console.log("error connecting to database"+err);
          }
          else{
  const drive = google.google.drive({version: 'v3', auth});
  drive.files.export({
    fileId: fileId,
    mimeType: 'text/html'
  }, (err, data) => {
    if (err) return console.log('The reading doc API returned an error: ' + err);
    const rawHTML = data.data;
    var handler = new htmlparser.DefaultHandler(function (error, dom) {
      if (error) {
        console.log('Parse error: ', error);
      }
    });
    const parser = new htmlparser.Parser(handler);
    parser.parseComplete(rawHTML);
    const parsedHTML = handler.dom;
    checkandmapchildren(parsedHTML,function(proceed){
      if (values.length == 0) {
        console.log("No values meet the condition");
        process.exit(0);
      } else {
        const sheets = google.google.sheets({version: 'v4', auth});
        sheets.spreadsheets.create({
          resource: {
            sheets: [
              {
                properties: {
                  title: "sample tab"
                }
              }
            ],
            properties: {
              title: "doc words list"
            }
          }  
        }, (err, data) => {
          if (err) return console.log('The create API returned an error: ' + err);
          sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: data.data.spreadsheetId,
            resource: {
              valueInputOption: 'RAW',
              data: { 
                range: 'A1',
                majorDimension: 'COLUMNS',
                values: [values],
              },
            },

          }, (err, data) => {
            if (err) return console.log('The update API returned an error: ' + err);
            var res =  data.config.data;
           console.log(res);
           var result = JSON.parse(res);
            // console.log(typeof(result));
           console.log(result);
        console.log(dbs);
         console.log("********************");
         // for(var n=0;n<arr.length;n++){
          var data = {
            "sentence" : arr[3]
          }
            
          dbs.collection("demo").insertOne(data,(err,dat)=>{
            if(err){
              console.log(err);
            }
            else{
            console.log("inserted doc");
           console.log(arr[n]);
           console.log("*");
            }
          });


         //}
       //
         //   console.log(data.config.data);
            console.log("DONE");
            process.exit(0);
          });
        });
      }  
    }); 
  });   
   }
  });
}

function checkandmapchildren(object,cb) {
  if (object.length != undefined){
    // console.log("hari");
    for(let i = 0; i < object.length; i++) {
      let miniobj = object[i];
      if(miniobj.children != null){
       checkandmapchildren(miniobj.children,function(once,value){
         if(once == true){
          if(miniobj.name != null){
            if (miniobj.name == "span"){
              if (miniobj.attribs != null){
                if(miniobj.attribs.style != null){
                  if (miniobj.attribs.style.indexOf("#93e3ed") != -1){
                  if(value != ''){
                   // console.log(value);
                    console.log("______________");
                     arr.push(value);
                    // console.log(value);
                  }
                    values.push(value);
                  }
                }
              }
            }
          }
         }
       });
      }
      if(miniobj.type != null){
        if(miniobj.type == "text"){
          cb(true,miniobj.data);
        }else{
         cb(false,null)
        }
      }else{
        cb(false,null)
      }
    }


  //     for(var n=0;n< arr.length;n++){
  //   console.log(arr[n]);
  // }
  }else{
   cb(false,null)
  }

}
app.listen(3000);

console.log('Running on port 3000...');

 

  