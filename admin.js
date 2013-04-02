var http = require('http');
var url = require('url');
var fs = require('fs');
var index = fs.readFileSync('admin.html');

http.createServer(function(request, response) {
  lVars = url.parse(request.url, true);
	if (lVars.query.list) {
    var file = fs.readFileSync(__dirname + '/lib/tracker/settings.json', "utf8");
    console.log(file);
    // var config = JSON.parse('{"list":'+file+'}');
    var config = JSON.parse(file);
    response.writeHead(200,{
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
    console.log(config);
    response.write(JSON.stringify(config));
    response.end();  
  }
  else {
    response.writeHead(200, {'Content-Type': 'text/html'});
  	response.end(index);
  }
}).listen(9615);