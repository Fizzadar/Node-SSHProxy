//modules
var randomstring = require( 'randomstring' ), net = require( 'net' ), socketio = require( 'socket.io' ), ssh = require( 'ssh2' ), fs = require( 'fs' );
//store requests (each stores a client [socket.io] and a server [ssh2] socket)
var requests = [];


//our 'event loop'
var evloop = {
    //step in our ssh2 <=> client
    step: function( key ) {
        console.log( '[' + key + '] Running next step' );
        //setup some bits
        var request = requests[key];
        if( request.commands.length > 0 ) {
            var command = requests[key].commands.shift();
            //execute command via ssh
            request.server.socket.exec( command, function( err, stream ) {
                //grab output
                stream.on( 'data', function( data, status ) {
                    request.client.socket.emit( 'receive_output', '' + data );
                });
                //when done, do next step
                stream.on( 'exit', function() {
                    console.log( '[' + key + '] "' + command + '" complete' );
                    evloop.step( key );
                });
            });
        //no more commands
        } else {
            //ended?
            request.client.socket.emit( 'request_end', 'ENDED' );
            request.client.socket.disconnect();
            request.server.socket.end();
            requests[key] = undefined;
            console.log( '[' + key + '] Complete' );
        }
    }
}


//simple net listen for nginx to issue commands
var listen_nginx = net.createServer( function( ngx ) {
    //not local? piss off!
    if( ngx.remoteAddress != '127.0.0.1' )
        ngx.end();

    //text > binary
    ngx.setEncoding( 'utf8' );
    //receive json bundle
    ngx.on( 'data', function( data ) {
        //try to convert to json, if not valid w/e (up to lua to format correctly)
        try {
            //get data
            var data = JSON.parse( data );
            var key = randomstring.generate( 30 );
            //build our request
            requests[key] = {
                interactive: data.interactive,
                commands: data.commands,
                server: data.server,
                client: {}
            }
            //drop connection once data added
            ngx.write( 'ACCEPTED KEY: ' + key + '\n' );
            ngx.end();
            console.log( '[Nginx Listen]: Request added ' + key );
        } catch( e ) {
            //cya!
            ngx.write( 'INVALID REQUEST\n' );
            ngx.end();
            console.log( '[Nginx Listen]: Invalid JSON input' );
        }
    });
});
listen_nginx.listen( 9002, function() { console.log( '[Nginx Listen]: Started' ) });


//socket.io listen for clients, add to valid request
var listen_clients = socketio.listen( 9001, { 'log level': 1 });
if( listen_clients ) console.log( '[Client Listen]: Started' );
listen_clients.sockets.on( 'connection', function( client ) {
    //make request
    client.on( 'capture_request', function( data ) {
        //try to convert to json
        try {
            //get data
            var data = JSON.parse( data );
            //key matches a request?
            if( data.key && requests[data.key] ) {
                var request = requests[data.key];
                console.log( '[' + data.key + '] Client connected' );
                client.emit( 'capture_request_response', 'ACCEPTED' );
                //interactive?
                if( request.interactive ) {
                    //add command to existing request
                    client.on( 'add_command', function( data ) {
                        request.commands[request.commands.length] = data
                        client.emit( 'add_command_response', 'ACCEPTED' );
                    });
                }
                //assign client socket
                requests[data.key].client.socket = client;
                //build server socket
                var server = new ssh();
                server.on( 'ready', function() {
                    console.log( '[' + data.key + '] SSH connection established' );
                    //start it up
                    evloop.step( data.key );
                });
                server.on( 'error', function( err ) {
                    console.log( '[' + data.key + '] SSH connection error: ' + err );
                })
                //work out params
                var server_params = {
                    host: request.server.host,
                    port: request.server.port,
                    username: request.server.user
                };
                if( request.server.key )
                    server_params.privateKey = require('fs').readFileSync( request.server.key );
                else if( request.server.password )
                    server_params.password = request.server.password;
                //connect
                server.connect( server_params );
                //assign server socket
                requests[data.key].server.socket = server;
            } else {
                client.emit( 'capture_request_response', 'INVALID KEY' );
                client.disconnect();
            }
        } catch( e ) {
            client.emit( 'capture_request_response', 'INVALID REQUEST' );
            client.disconnect();
        }
    });
});