<script src="socket.io.js"></script>
<script>
  var socket = io.connect( 'http://localhost:9001' );
  socket.on( 'connect', function() {
    socket.emit( 'start', 'test' );
    socket.on( 'message', function( data ) {
      console.log( data );
    });
    socket.on( 'receive_output', function( data ) {
    	console.log( data );
    });
    socket.on( 'request_end', function( data ) {
    	console.log( data );
    });
    socket.on( 'add_command_response', function( data ) {
    	console.log( data );
    });
    socket.on( 'capture_request_response', function( data ) {
    	console.log( data );
    });
  });

  var request = {
    //allow user to write back?
    interactive: false,
    //commands to run - can be added when interactive = true
    commands: [
      'top -b -n 1',
      'vzlist'
    ],
    server: {
    	host: 'vps',
    	port: 22,
    	user: 'root',
    	key: '/Users/Fizzadar/.ssh/id_rsa',
    	password: 'nothing'
    }
  }
  console.log( JSON.stringify( request ) );

  function test( key ) {
  	socket.emit( 'capture_request', JSON.stringify({
  		key: key
  	}));
  }
</script>