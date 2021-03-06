module.exports = function(socket) {
  // Latency Check
  socket.on('pingRequest', (data) => {
    let latency = Date.now() - data.startTime;
    if (latency < 0)
      latency = 0;

    // send ping to client
    socket.emit('pingResponse', {
      ping: latency,
      userId: socket.request.user.username,
    });

    // send ping to opponent
    socket.broadcast.emit('pingResponse', {
      ping: latency,
      userId: socket.request.user.username,
    });
  });
}
