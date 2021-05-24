// const Express = require('express')
// const Http = require('http').Server(Express)
// const Socketio = require('socket.io')(Http)

var app = require('express')();
var http = require('http').createServer(app);
var Socketio = require('socket.io')(http);


const geojsonvt = require('geojson-vt')
const vtpbf = require('vt-pbf')
const dataLand = require('./data/ne_10m_land.json')
const dataLakes = require('./data/ne_10m_lakes.json')

// build the tile index from GeoJSON source data
console.time("indexing");
const tileIndex = geojsonvt(dataLakes)
console.timeLog("indexing");

console.timeEnd("indexing");
const port = process.env.PORT || 3000

const markers = [];

Socketio.on("connection", socket => {
    console.log('a user connected');
    for(let i = 0; i<markers.length; i++) {
        socket.emit("marker", markers[i])
    }
    socket.on("marker", data => {

        console.log('socket marker',data)
        markers.push(data);
        // update all users (SOCKETIO instead of socket)
        Socketio.emit("marker", data);
    })
})

// , handleRequest)
// expects urls in the format: /{Z}/{X}/{Y}.pbf
app.get('/:Z/:X/:Y', (req, res) => {
    const [z, x, y] = req.url
        .replace('.pbf', '')
        .split('/')
        .filter(n => n)
        .map(n => parseInt(n))

    // get the vectors for this tile
    const tile = tileIndex.getTile(z, x, y)

    // console.debug(tile);
    // if there is no tile data, return an empty response
    if (!tile) {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' })
        return res.end()
    }

    // encode as protobuf
    const buffer = Buffer.from(vtpbf.fromGeojsonVt({ geojsonLayer: tile }))

    // write the buffer to the response stream
    res.writeHead(200, {
        'Content-Type': 'application/protobuf',
        'Access-Control-Allow-Origin': '*'
    })
    res.write(buffer, 'binary')
    res.end(null, 'binary')
})

// app.get('/', (req, res) => {
//     res.sendFile(__dirname + '/frontend/index.html');
// });
//
// app.get('/public/location*', (req, res) => {
//     console.debug('location',req.params.location)
//     res.sendFile(__dirname + '/frontend/public/' + req.params.location);
// });

http.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})