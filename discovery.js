var hyperswarm = require('hyperswarm')
var crypto = require('crypto');

var swarm = hyperswarm()

// look for peers listed under this topic
const topic = crypto.createHash('sha256')
  .update('my-p2p-app-rm')
  .digest()

swarm.join(topic, {
  lookup: true,
  announce: true,
})

// this event is fired every time you find and connect to a new peer also on the same key
swarm.on('connection', function (socket, details) {
  // `info `is a simple object that describes the peer we connected to
  console.log('found a peer', details)
  // `connection` is a duplex stream that you read from and write to
  socket.write('hello')
  
  socket.on('data', (data) => {
    console.log(data.toString('utf8'))
  })
})