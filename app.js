var express = require('express'),
	app = express(),
	server = require('http').createServer(app);
	io = require('socket.io').listen(server),
	mongoose = require('mongoose');
	users = {};

server.listen(3000);

mongoose.connect('mongodb://localhost/chat',function(err){

	if(err){
		console.log(err);
	}else{
		console.log('connected to mongoDb');
	}
});

var chatSchema = mongoose.Schema({

	nick : String,
	msg : String,
	created : {type: Date, default : Date.now}
});

var chat = mongoose.model('Message', chatSchema);


app.get('/',function(req,res){

	res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection',function(socket){

	var query = chat.find({});

	query.sort('-created').limit(8).exec(function(err, docs){
		if(err)throw err;
		socket.emit('LoadOldMsg', docs);
	});

	socket.on('newUser',function(data,callback){

		if(data in users){
			callback(false);
		}else{
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			updateNicknames();
		}
	});

	function updateNicknames(){

		io.sockets.emit('usernames',Object.keys(users));
	};
	
	socket.on('sendMessage',function(data,callback){
		var msg = data.trim();
		if(msg.substr(0,3) === '/w ' ){
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1){
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind+1);
				if(name in users){ 
					users[name].emit('whisper',{msg : msg, nick: socket.nickname});
					console.log('Whisper Mesage');
				}else{
					callback('Error ! ENter a valid user');
				}
			}else{
				callback('Error! Please enter a message for your message');
			}	
		}
		else{
			io.sockets.emit('newMessage',{msg : msg, nick: socket.nickname});
		}
	});

	socket.on('disconnect',function(data){

		if(!socket.nickname)return;
		delete users[socket.nickname];
		updateNicknames();
	});
});
