const fs = require(`fs-extra`);
const { Client } = require('whatsapp-web.js');
const express = require("express");
const axios = require("axios");
const socket = require("socket.io");
const cors = require("cors");
var uuid = require("uuid");
const realtime = require("./realtime");
const config = require('./config.json');

const SERVER_WEB = config.url_web;


function generateapikey(id_device) {
    var id = uuid.v4();

    CALLAPILOGIN = axios.create({
        baseURL: SERVER_WEB,
        crossdomain: true
    })

    CALLAPILOGIN.get(`/devices/endpoint_update/` + id_device + `?apikey=` + id + `&status=offline`).then(res => {
        // console.log(res);
        console.log("UPDATE DEVICES " + id_device + " SUKSES");
    }).catch(e => {
        // console.log(e.response ? e.response : e);
        console.log("UPDATE DEVICES GAGAL");
    });
}

function changeallstatus(status) {

    CALLAPILOGIN = axios.create({
        baseURL: SERVER_WEB,
        crossdomain: true
    })

    CALLAPILOGIN.get(`/devices/endpoint_update_status_all?status=` + status).then(res => {
        // console.log(res);
        console.log("UPDATE STATUS ALL DEVICES SUKSES");
    }).catch(e => {
        // console.log(e.response ? e.response : e);
        console.log("UPDATE STATUS ALL DEVICES GAGAL");
    });
}


const session = function (number, id_socket, id_device) {
    var n = 0;
    console.log('number', number);

    let session_file;
    if (fs.existsSync(`./sessions/${number}.json`)) {
        // session_file = require(`./sessions/${number}.json`);
        // console.log('session_file', session_file);
        fs.removeSync(`./sessions/${number}.json`);
        fs.removeSync(`./sessions/${number}`);
    }

    const client = new Client({
        puppeteer: {
            // headless: false,
            userDataDir: __dirname + `/sessions/${number}`,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        },
        session: session_file
    });

    client.initialize();

    client.on(`qr`, (qr) => {
        if (n < 3) {
            console.log(number, "=> qr", qr);
            io.to(id_socket).emit("qr", qr);
            n++;
        } else {
            client.destroy();
            io.to(id_socket).emit("qr_closed");
        }
    });

    client.on(`authenticated`, (session) => {
        if (!fs.existsSync(`./sessions/${number}.json`)) {
            fs.writeFile(`./sessions/${number}.json`, JSON.stringify(session), function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(`Session stored`);
                    generateapikey(id_device);
                    io.to(id_socket).emit("action", "refresh");
                    client.destroy();
                }
            });
        }
    });
};




// App setup
const PORT = 3000;
const app = express();
// use cors
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/login/:phone', (req, res) => {
    new session(req.params.phone);
    res.json({
        "generate": "ok"
    });
})

app.get('/delete/:phone', (req, res) => {
    var number = req.params.phone;
    if (fs.existsSync(`./sessions/${number}.json`)) {
        // session_file = require(`./sessions/${number}.json`);
        // console.log('session_file', session_file);
        fs.removeSync(`./sessions/${number}.json`);
        fs.removeSync(`./sessions/${number}`);
    }
    res.json({
        "delete": "ok"
    });
})

const server = app.listen(PORT, function () {
    console.log(`Listening on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});

app.use(realtime);

changeallstatus("offline");

// Socket setup
const io = socket(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


io.on("connection", function (socket) {
    console.log("Made socket connection");
    io.to(socket.id).emit("greetings", "I just met you");

    socket.on("qr", function (id_device) {
        console.log("Get Qr");
        new session(id_device, socket.id, id_device);
        console.log(id_device);
    });

});
