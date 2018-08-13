exports = module.exports = function(socket){
  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data.message,
      gameid: data.gameid,
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (data) => {
    // we store the username in the socket session for this client
    socket.username = data.username;

    socket.emit('login', {
      // numUsers: numUsers,
      gameid: data.gameid,
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      // numUsers: numUsers,
      gameid: data.gameid,
    });
  });

  socket.on('leave chat', (data) => {
    socket.broadcast.emit('user left', {
      username: socket.username,
      gameid: data.gameId,
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', (data) => {
    // only broadcast when user is the same on server
    if (socket.username === data.username) {
      socket.broadcast.emit('typing', {
        username: socket.username,
        gameid: data.gameid,
      });
    }
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', (data) => {
    // only broadcast when user is the same on server
    if (socket.username === data.username) {
      socket.broadcast.emit('stop typing', {
        username: socket.username,
        gameid: data.gameid,
      });
    }
  });
}
