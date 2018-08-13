exports = module.exports = function(socket){
  // Latency Check
  socket.on('reportPing', (data) => {
    let latency = Date.now() - data.startTime;
    if (latency < 0)
      latency = 0;

    // send ping to client
    socket.emit('sendPing', {
      ping: latency,
      userId: socket.userId,
    });

    // send ping to opponent
    socket.broadcast.emit('sendPing', {
      ping: latency,
      userId: socket.userId,
    });
  });
}
