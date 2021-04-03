const { Client } = require('whatsapp-web.js');
const fs = require(`fs`);
const router = require('express').Router();
const axios = require("axios");
const config = require('./config.json');

const SERVER_WEB = config.url_web;

let sessions = {};
const session = function (id_device) {
    const SESSION_FILE_PATH = `./sessions/${id_device}.json`;

    if (fs.existsSync(SESSION_FILE_PATH)) {
        sessionData = require(SESSION_FILE_PATH);
    }

    const puppeteerOptions = {
        session: sessionData,
        puppeteer: {
            userDataDir: `./sessions/${id_device}`,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    };

    // Use the saved values
    sessions[id_device] = new Client(puppeteerOptions);

    sessions[id_device].initialize();

   // Save session values to the file upon successful auth
    sessions[id_device].on('authenticated', (session) => {
        sessionData = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) console.log(err);
			else console.log(id_device,`=> Session stored`);
        });
    });

    // ...


	sessions[id_device].on(`ready`, () => {
		console.log(id_device,`=> ready`);
        ganti_status(id_device,"online")
	});

	sessions[id_device].on(`message`, async msg => {
		console.log(id_device,'=> received message')
        if(msg.body === '!ping') {
            sessions[id_device].sendMessage(msg.from, 'pong');
        }
        if (config.webhook.enabled) {
            axios.post(config.webhook.path+"?id_device="+id_device, { msg })
        }
	});

	sessions[id_device].on(`disconnected`, (reason) => {
		console.log(id_device,`=> disconnected`, reason);
        ganti_status(id_device,"offline")
	});

    sessions[id_device].on(`change_state`, (reason) => {
		console.log(id_device,`=> change_state`, reason);
        if(reason=="CONNECTED"){
        ganti_status(id_device,"online")
        }else{
            ganti_status(id_device,reason)
        }
	});

    sessions[id_device].on(`auth_failure`, (msg) => {
        console.log(id_device,`=> auth_failure`, msg);
        ganti_status(id_device,"auth_failure")
    });
    return sessions[id_device];
};
// var whatsess = session('085155075517');

function ganti_status(id_device,status) {

    CALLAPILOGIN = axios.create({
        baseURL: SERVER_WEB,
        crossdomain: true
    })
    
    CALLAPILOGIN.get(`/devices/endpoint_update/` + id_device+`?status=`+status).then(res => {
        // console.log(res);
        console.log("UPDATE DEVICES "+id_device+" SUKSES");
    }).catch(e => {
        // console.log(e.response ? e.response : e);
        console.log("UPDATE DEVICES GAGAL");
    });
}

router.get('/realtime/:id_device', async (req,res) => {
    session(req.params.id_device, req.params.phone);
    ganti_status(req.params.id_device,"queue")
    res.json({
        "status": "queue"
    });
});

router.get('/sendmessage/:id_device/:no_telp', async (req,res) => {
    // console.log(req.params.no_telp);
    // console.log(req.query.text);
        try {
        const product = await sessions[req.params.id_device].sendMessage(`${req.params.no_telp}@c.us`, req.query.text);
        product['status']="ok";
        res.send(product);
    } catch (err) {
        product['err']="err";
        console.log(err);
        res.send(err);

    }
    
    // res.json({
    //     "to":req.params.no_telp,
    //     "text": req.query.text,
    //     "status":"ok"
    // });
});


module.exports = router;