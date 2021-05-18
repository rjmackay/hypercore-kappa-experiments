var hyperswarm = require('hyperswarm')
var hypercore = require('hypercore')
var multifeed = require('multifeed')
var pump = require('pump')
var ram = require('random-access-memory')
var crypto = require('crypto');

const topic = crypto.createHash('sha256')
    .update('multichat-rjmackay')
    .digest()

var multi = multifeed(ram, {
    valueEncoding: 'json'
})
var swarm = hyperswarm()

multi.writer('local', function (err, feed) {
    // console.log('public key:', feed.key.toString('hex'))
    // console.log('discovery key:', feed.discoveryKey.toString('hex'))
    // console.log('secret key:', feed.secretKey.toString('hex'))
    // we use the discovery as the topic
    swarm.join(topic, { lookup: true, announce: true })
    swarm.on('connection', function (connection, info) {
        console.log('(New peer connected!)', info.peer)

        // We use the pump module instead of stream.pipe(otherStream)
        // as it does stream error handling, so we do not have to do that
        // manually.

        // See below for more detail on how this work.
        pump(connection, multi.replicate(info.client , { live: true }), connection)
    })

    process.stdin.on('data', function (data) {
        feed.append({
            type: 'chat-message',
            nickname: 'cat-lover',
            text: data.toString().trim(),
            timestamp: new Date().toISOString()
        })
    })
});

multi.ready(function () {
    console.log("Ready");
    var feeds = multi.feeds()

    // iterate over each feed that exists locally..
    feeds.forEach(function (feed) {
        feed.createReadStream({ live: true })
            .on('data', function (data) {
                console.log(`${data.timestamp} ${data.nickname}: ${data.text}`)
            })
    })

    // listen for new feeds that might be shared with us during runtime..
    multi.on('feed', function (feed) {
        feed.createReadStream({ live: true })
            .on('data', function (data) {
                console.log(`${data.timestamp} ${data.nickname}: ${data.text}`)
            })
    })
})

