var http = require('http');
var url = require('url');
var fs = require('fs');
var index = fs.readFileSync('admin.html');
var path = require("path");

http.createServer(function(request, response) {
  lVars = url.parse(request.url, true);
  if (lVars.query.action) {
    console.log('action = ' + lVars.query.action);

    if (lVars.query.action == 'content') {
      var file = fs.readFileSync(__dirname + '/lib/tracker/settings.json', "utf8");
      var config = JSON.parse(file);
      response.writeHead(200,{
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
              });
      response.write(JSON.stringify(config));
      response.end();   
    }
    esle if (lVars.query.action == 'save') {

    }
  }

  else {
    response.writeHead(200, {'Content-Type': 'text/html'});
  	response.end(index);
  }
}).listen(9615);