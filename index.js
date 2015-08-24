/*
IMPENDING IMPROVEMENTS:
> Brodcast a message to connected users when someone connects or disconnects
> Add support for nicknames ' henceforth user-identification'
> Don’t send the same message to the user that sent it himself. Instead, append the message directly as soon as he presses enter.
> Add “{user} is typing” functionality [DONE]
> Show who’s online
> Add private messaging
*/

//Statistics
var totalLiveUsers = 0;

//Express initializes app to be a funciton handler that is to be supplied to the http server later
var app = require('express')();
//
var http = require('http').Server(app);
var io = require('socket.io')(http);

connectedUsersList = [];

// Defining a route handler '/' that gets called whenever we hit index.html
//sendFile is used as refractor to separate all the html code from this file
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  	totalLiveUsers += 1;
  	console.log('a user connected, total users: '+totalLiveUsers);
  	
  	socket.on('chat message', function(data){
      io.emit('new message', {message:data, sender: socket.userName});
    });

    //On recieveing a request to add a new user
    socket.on('new user', function(data, callback){
      //If the username entered is already present
      if(connectedUsersList.indexOf(data) != -1){
        callback(false);
      }
      else{
        callback(true);
        socket.userName = data; //associate username to the socket
        connectedUsersList.push(socket.userName); //add username to the connected-users-list
        updateUsernamesList();  //update the list and send to all the connected clients
      }
    });
  	
    function updateUsernamesList(){
      io.emit('connected users list', connectedUsersList);      //send the updted list to all the clients connected
    }

    socket.on('typing status', function(typing){
    	if(typing){
    		console.log('user is typing..');
        io.emit('typing status', {status:typing, person: socket.userName});
    	}
    });
    
  	socket.on('disconnect', function(data){
  		totalLiveUsers -= 1;
  		console.log(' a user disconnected, total users: '+totalLiveUsers);
      if(socket.userName){
        connectedUsersList.splice(connectedUsersList.indexOf(socket.userName),1);//Remove the name if the userName is set and the guy disconnects
        io.emit('user left', {name:socket.userName});
        updateUsernamesList();
      }
  	});
});

//server listening
http.listen(3000, function(){
  console.log('listening on *:3000');
});

