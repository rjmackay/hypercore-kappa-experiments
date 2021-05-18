var hyperswarm = require('hyperswarm')
var hypercore = require('hypercore')
var pump = require('pump')

var feed = hypercore('./data/single-chat-feed-clone', '678887580effba84cef185793177c987c55588fd632dd11f7156f384d114559b', {
  valueEncoding: 'json'
})

feed.createReadStream({ live: true})
  .on('data', function (data) {
    console.log(`${data.timestamp} ${data.nickname}: ${data.text}`)
  })

var swarm = hyperswarm()

feed.ready(function () {
  // we use the discovery as the topic
  swarm.join(feed.discoveryKey)
  swarm.on('connection', function (connection, details) {
    if (details.client) console.log('(New peer connected!)', details.peer);

    // We use the pump module instead of stream.pipe(otherStream)
    // as it does stream error handling, so we do not have to do that
    // manually.

    // See below for more detail on how this work.
    pump(connection, feed.replicate(details.initiator, { live: true }), connection)
  })
  swarm.on('disconnection', function (connection, details) {
    console.log('(Why you drop?!)', details.peer);
  });
})