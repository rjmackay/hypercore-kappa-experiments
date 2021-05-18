var hyperswarm = require('hyperswarm')
var hypercore = require('hypercore')
var pump = require('pump')

var feed = hypercore('./data/single-chat-feed', {
  valueEncoding: 'json'
})
var swarm = hyperswarm()

// feed.append({ 
//   type: 'chat-message',
//   nickname: 'cat-lover',
//   text: 'hello world', 
//   timestamp: '2018-11-05T14:26:000Z' // new Date().toISOString()
// }, function (err, seq) {
//   if (err) throw err
//   console.log('Data was appended as entry #' + seq)
// })

// feed.get(0, console.log)
// feed.get(1, console.log)

feed.ready(function () {
  console.log('public key:', feed.key.toString('hex'))
  console.log('discovery key:', feed.discoveryKey.toString('hex'))
  console.log('secret key:', feed.secretKey.toString('hex'))
  // we use the discovery as the topic
  swarm.join(feed.discoveryKey, { lookup: true, announce: true })
  swarm.on('connection', function (connection, details) {
    if (details.client) console.log('(New peer connected!)', details.peer);

    // We use the pump module instead of stream.pipe(otherStream)
    // as it does stream error handling, so we do not have to do that
    // manually.

    // See below for more detail on how this work.
    pump(connection, feed.replicate(details.client, { live: true }), connection)
  })
})

process.stdin.on('data', function (data) {
  feed.append({
    type: 'chat-message',
    nickname: 'cat-lover',
    text: data.toString().trim(),
    timestamp: new Date().toISOString()
  })
})

feed.createReadStream({ live: true })
  .on('data', function (data) {
    console.log(`${data.timestamp} ${data.nickname}: ${data.text}`)
  })
