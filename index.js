let express = require ('express');
let app = express ();
var http = require('http').Server(app);
var io = require('socket.io')(http);
let usernames= [];
let message_history = [];
let adj = ['big', 'small', 'grizzly', 'tiny', 'cute', 'mean', 'angry', 'sad'];
let noun = ['dog', 'cat', 'rabbit', 'bird', 'bear', 'panda', 'elephant', 'hamster'];
let user_color = [];


app.use ('/public', express.static('public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/views/index.html');
});



io.on('connection', function(socket){


    socket.on('connected', function() {
      //get a random arrangement of the two lists to create a new username
      let u = adj[Math.floor(Math.random()*8)] + '-' + noun[Math.floor(Math.random()*8)];
      //set that random user name as that persons username
      socket.username = u;
      //add the username to list of active users
      usernames.push(socket.username);
      user_color.push({usr: socket.username, color: '000000'});
      console.log("1 " + socket.username);
      //send all people currently on to the client
      socket.emit('all users', {username: socket.username , current_users: usernames, history: message_history, color: user_color});
      //show a new user to all of the current users
      socket.broadcast.emit('add user', socket.username);
    });
   
    socket.on('chat message', function(msg){
      //get the time of when the message was sent
      let ts = new Date();
      //corrent the time to fit in the right time zone
      ts.setTime( ts.getTime() - ts.getTimezoneOffset()*60*1000 );
      console.log("2 " + socket.username);
      //save the messages for new users
      message_history.push({mess: msg, user: socket.username, timestamp: ts, color: user_color});
      //send the message and username and the time to the client
      let i = null;
      let ind = user_color.findIndex(x => x.usr === socket.username);
      if (ind != -1) {
        i = ind;
      }
      io.emit('chat message', {mess: msg, user: socket.username, timestamp: ts, color: user_color, index: i});
    });

    //change user name
    socket.on('change nick', function(data, callback){
      //if the username already exits, print the error message
      if (usernames.indexOf(data) != -1) {
        callback(false);
      }
      //otherwise change the username in all occurances
      else {
        callback(true);
        //show all users the new nick name
        socket.broadcast.emit('add newnick', socket.username, data);
        //change username in color array
        let i = user_color.findIndex(x => x.usr === socket.username);
          if (i != -1) {
              user_color[i].usr = data;
          }
        //replace active users
        usernames.splice(usernames.indexOf(socket.username), 1);
        socket.username = data;
        usernames.push(socket.username);
        console.log(usernames, socket.username);
        //tell client about nick change
        socket.emit('new nickname', {username: socket.username , current_users: usernames});
        
      }
    });

    socket.on('color change', function(user, color){
      let ind = user_color.findIndex(x => x.usr === user);
      if (ind != -1) {
        user_color[ind].color = color;
      }
      console.log(user_color);
      socket.broadcast.emit('color forall', socket.username, color);
      socket.emit('change color', user_color);
    });

    //when a user leaves the chat
    socket.on('disconnect', function() {
      if(!socket.username) return;
      //remove the user from the list of users
      usernames.splice(usernames.indexOf(socket.username), 1);
      //tell client which user has disconnected
      io.emit("remove user", socket.username);
  });

});
  

http.listen(3000, function(){
  console.log('listening on *:3000');
});