#Node SSHProxy
**Warning**: this requires some setup + telnet fiddling to run. A SSH proxy for basic SSH commands via the browser. Note: this is part of another larger project I'm working on, this code is extremely simple at the moment.

####1. Run the Server
	node sshserver.js

#####2. Prepare it
You'll need to telnet localhost:9002 (port defined on line #75) and send only a JSON string with your request, eg:

	{"interactive":false,"commands":["top -b -n 1","vzctl stop 2949"],"user":{"id":1,"key":"xyz"},"server":{"host":"vps","port":22,"user":"root","key":"/Users/Fizzadar/.ssh/id_rsa","password":"nothing"}}
	
The idea being that your server-side code would normally do this for you (you'll see the code calls this server a Nginx listen server). After you run this you'll be given a key and disconnected.

#####3. To the Browser
Take that key, load up socket.html in your browser and open up the javascript console. Run the test function with your key:

	test( 'KEY' );
	
If done correctly you should see "ACCEPTED" and the output of the SSH commands. You can watch the request be processed in the node output.

Code copyright: public domain/unlicensed.