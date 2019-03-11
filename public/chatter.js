$(function() {
    var socket = io.connect('http://localhost:3000');

    var $message = $('#message-form');
    var $userError = $('#username-error');
    var $users = $('#userdiv');
    let active_users = [];
    let curr_username = '';
    let chat_history = [];
    let user_color = '';
    let color_u = [];

    var socket = io();

    //connect to the server, start adding the random usernames
    socket.on('connect', function() {
        socket.emit('connected');
    });

    //initializing the first users that are already connected
    socket.on('all users', function(data) {
        active_users = data.current_users;
        curr_username = data.username;
        chat_history = data.history;
        color_u = data.color;

        data.current_users.splice(data.current_users.indexOf(data.username, 1));
        let all_users = ''
        //create a string with all users currently online
        for (let i = 0; i < data.current_users.length; i++) {
            all_users =  all_users + '<li>' + data.current_users[i];
        }
        //make sure the time is in the right format
        let isPM = false;
        let true_time = '';
        for (let j = 0; j < chat_history.length; j++) {
            //get the time...
            let temp_time = chat_history[j].timestamp.slice(11, -11);
            if (temp_time > 12) {
                isPM = true;
                temp_time = temp_time - 12;
            }
            else {
                isPM = false;
            }
            //add the pm or the am to the end of the time
            if (isPM) {
                true_time = temp_time + chat_history[j].timestamp.slice(13, -8) + ' pm';
            }
            else {
                true_time = temp_time + chat_history[j].timestamp.slice(13, -8) + ' am';
            }
            //populate the chat with messages that people have already sent
            let col = '';
            //get the right color for the person
            let i = color_u.findIndex(x => x.usr === chat_history[j].user);
                if (i != -1) {
                    col = color_u[i].color;
                }
            $('#messages').append($("<li>").html('<div class="username" style="color: #' + col + '">' + chat_history[j].user + "</div><div class='time'> " + chat_history[j].timestamp.replace(/#|-/g,'/').slice(0, -14) + '  ' + true_time +  "</div><div class='message_list'> " + chat_history[j].mess + "</div>"));
        }
        $('#messages')[0].scrollTop =  $('#messages')[0].scrollHeight;
        //print current users to user
        $users.html("<div> <p class='you'>" + data.username + '</p></div>' + all_users);
    });

    //for when a user enters
    socket.on('add user', function(data){
        //push color into the user
        color_u.push({usr: data, color: '000000'});
        //add user to active user list
        active_users.push(data);
        //add the user to the user list
        $users.append($('<li>').html(data));
    });

    socket.on('add newnick', function(old, nw){
        //replace old username with new one
        let i = active_users.indexOf(old);
        active_users[i] = nw;
        //change the user list
        let nw_user = '';
        for (let i = 0; i < active_users.length; i++) {
            nw_user =  nw_user + '<li>' + active_users[i];
        }
        $users.html("<div> <p class='you'>" + curr_username + '</p></div>' + nw_user);
    });

    //change the color for that user for everyone
    socket.on('color forall', function(name, col){
            let i = color_u.findIndex(x => x.usr === name);
            if (i != -1) {
                color_u[i].color = col;
            }
    });

    socket.on('remove user', function(data){
        //remove the user from the list of users
        active_users.splice(active_users.indexOf(data), 1);
        //update list of active users
        let new_users = '';
        for (let i = 0; i < active_users.length; i++) {
            new_users =  new_users + '<li>' + active_users[i];
        }
       $users.html("<div> <p class='you'>" + curr_username + '</p></div>' + new_users);
    });

    //when the user types a message (from the tutorial)
    $message.submit(function(){
        let sub_message = $('#m').val();
        //change the colour of the name
        if (sub_message.startsWith('/nickcolor')){
            //make sure there are no other messages afterwards
            if (sub_message.length === 17) {
                user_color = sub_message.substring(11, 17);
                //make sure they dont user other characters other than 0-9 a-z
                if (user_color.match("^[A-z0-9]+$") != null) {
                    socket.emit('color change', curr_username, user_color);
                    //change the username color for the current username only
                    let i = color_u.findIndex(x => x.usr === curr_username);
                        if (i != -1) {
                            color_u[i].color = user_color;
                        }
                    socket.emit('chat message', curr_username + " changed their color to " + user_color);
                }
                //error message for special characters
                else {
                    $('#messages').append($("<li>").html('<div class="error">Please only user numbers and letters to change the color.</div>'));
                    $('#messages')[0].scrollTop =  $('#messages')[0].scrollHeight;
                }
            }
            //error message for length
            else {
                $('#messages').append($("<li>").html('<div class="error">Please format /nickcolor like RRBBGG (eg. /nickcolor c0c0c0).</div>'));
                $('#messages')[0].scrollTop =  $('#messages')[0].scrollHeight;
            }
            $('#m').val('');
            return false;
        }
        //changin the username when user types the keywords
        if (sub_message.startsWith('/nick')) {
            //get the username they selected
            let new_name = sub_message.substring(6, sub_message.length);
            //make sure new username is not too long
            if (new_name.length <= 20) {
                //change the username in the server
                socket.emit('change nick', new_name, function(data){
                    if(!data) {
                        $('#messages').append($("<li>").html('<div class="error">This username is already taken! Please choose another one.</div>'));
                        $('#messages')[0].scrollTop =  $('#messages')[0].scrollHeight;
                    }
                    //show others who changed name
                    else {
                        socket.emit('chat message', curr_username + " changed their name to " + new_name);
                    }
                });
            }
            //error message
            else {
                $('#messages').append($("<li>").html('<div class="error">Please pick a shorter username (can be up to 20 characters long).</div>'));
                $('#messages')[0].scrollTop =  $('#messages')[0].scrollHeight;
            }
            $('#m').val('');
            return false;
        }
        //if no commands just print message
        else {
            socket.emit('chat message', $('#m').val());
        }
        $('#m').val('');
        return false;
    });

    socket.on('new nickname', function(data){
        //the old nick name from the box
        active_users = data.current_users;
        curr_username = data.username;
        active_users.splice(active_users.indexOf(curr_username), 1);
        //update list of active users
        let new_1 = '';
        for (let i = 0; i < active_users.length; i++) {
            new_1 =  new_1 + '<li>' + active_users[i];
        }
        $users.html("<div> <p class='you'> " + curr_username + '</p></div>' + new_1);
    });
    //update the color_u list
    socket.on('change color', function(data){
        color_u = data;
    });

    //format the message that the user sends (from the tutorial)
    socket.on('chat message', function(msg){
        
        //get correct time 
        let isPM = false;
        let true_time = '';
        let temp_time = msg.timestamp.slice(11, -11);
        if (temp_time > 12) {
            isPM = true;
            temp_time = temp_time - 12;
        }
        else {
            isPM = false;
        }
        //add the pm or the am to the end of the time
        if (isPM) {
            true_time = temp_time + msg.timestamp.slice(13, -8) + ' pm';
        }
        else {
            true_time = temp_time + msg.timestamp.slice(13, -8) + ' am';
        }

        //bold the current user
        if (curr_username === msg.user) {
            $('#messages').append($("<li class='current_user'>").html('<div class="username" style="color: #' + color_u[msg.index].color + '"><b>' + msg.user + "</b></div><div class='time'> " + msg.timestamp.replace(/#|-/g,'/').slice(0, -14) + '  ' + true_time + "</div><div class='message_list'> " + msg.mess + "</div>"));
        }
        //if its not the current user then dont bold it
        else {
            $('#messages').append($("<li>").html('<div class="username" style="color: #' + color_u[msg.index].color + '">' + msg.user + "</div><div class='time'> "+  msg.timestamp.replace(/#|-/g,'/').slice(0, -14) + '  ' + true_time + "</div><div class='message_list'> "  + msg.mess + "</div>"));
        }
        //make the messages scrollable
        $('#messages')[0].scrollTop =  $('#messages')[0].scrollHeight;
    });

});