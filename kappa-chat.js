var kappa = require('kappa-core')
var ram = require('random-access-memory')
var crypto = require('crypto');
var hyperswarm = require('hyperswarm')
var pump = require('pump')
var list = require('kappa-view-list')
var memdb = require('memdb');
var _ = require('lodash');

const topic = crypto.createHash('sha256')
    .update('multichat-rjmackay')
    .digest()
var swarm = hyperswarm()

var timestampView = list(memdb(), function (msg, next) {
    if (msg.value.timestamp && typeof msg.value.timestamp === 'string') {
        // sort on the 'timestamp' field
        next(null, [msg.value.timestamp])
    } else {
        next()
    }
})
dedupeId = crypto.randomBytes(32);

var core = kappa(ram, { valueEncoding: 'json' })
core.use('chats', timestampView)
core.writer('local', function (err, feed) {
    swarm.join(topic, { lookup: true, announce: true })
    swarm.on('connection', function (connection, info) {
        connection.write(dedupeId)
        connection.once('data', function (id) {
            const dupe = info.deduplicate(dedupeId, id)
            console.log(dupe ? '[Dupe peer dropped]' : '[New peer connected!]')
            pump(connection, core.replicate(info.client, { live: true }), connection)
        });
    });
    swarm.on('updated', () => {
        console.log("Updated");
    });

    process.stdin.on('data', function (data) {
        feed.append({
            type: 'chat-message',
            nickname: 'cat-lover',
            text: data.toString().trim(),
            timestamp: new Date().toISOString()
        })
    })
})

core.ready(['chats'], function () {
    console.log("Ready");
    _.delay(() => { // Delay 300ms to catch up with remote
        // Get latest 10 messages
        core.api.chats.read({ limit: 10, reverse:true }, function (err, data) {
            if (data.length === 0) return;
            console.log("Recent messages:")
            for (let msg of data.reverse()) {
                console.log(`${msg.value.timestamp} ${msg.value.nickname}: ${msg.value.text}\t(${msg.key})`)
            }
        })
        // Listen for latest message. 
        core.api.chats.tail(1, function (data) {
            for (let msg of data) {
                console.log(`${msg.value.timestamp} ${msg.value.nickname}: ${msg.value.text}\t(${msg.key})`)
            }
        });
    }, 300);
})
