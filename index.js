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
var mongoose  = require('mongoose');

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'
var dbName = "/chatproto";

var link_to_db;
// if OPENSHIFT env variables are present, use the available connection info:
if (process.env.OPENSHIFT_MONGODB_DB_URL) {
    link_to_db = process.env.OPENSHIFT_MONGODB_DB_URL +
    process.env.OPENSHIFT_APP_NAME;
}
else{
  link_to_db = 'mongodb://localhost';
}

connectedUsersList = [];

// Connectin to Mongo DB
mongoose.connect(link_to_db+dbName, function(err){
  if(err){
    console.log('Unable to connect to db'+err);
  }
  else{
    console.log('Database connection successful');
  }
});

//Create DB Schema
var chatSchema = mongoose.Schema({
  userName: String,
  message: String,
  created:{type: Date, default:Date.now}
});

var chatModel = mongoose.model('Message',chatSchema);
// Defining a route handler '/' that gets called whenever we hit index.html
//sendFile is used as refractor to separate all the html code from this file
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  	totalLiveUsers += 1;
    var queryDB = chatModel.find({});
    queryDB.sort('-created').limit(8).exec(function(err, docs){
      if(err) throw err;
      console.log('sending old msgs to new user...');
      socket.emit('old msgs',docs);
       
    });
    

  	console.log('a user connected, total users: '+totalLiveUsers);
  	
  	socket.on('chat message', function(data){
      var newMsg = new chatModel({message:data, userName:socket.userName});
      newMsg.save(function(err){
        if(err){throw err;} 
        else{
              io.emit('new message', {message:data, sender: socket.userName});
        }

      });
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
http.listen(server_port, server_ip_address, function(){
  console.log('listening on *:'+server_port);
});

