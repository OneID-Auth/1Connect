const express = require('express');
const app = express();
const axios = require('axios');
const appwrite = require('node-appwrite');
const PORT = parseInt(process.env.PORT) || 5955
const router = new express.Router();
const bcrypt = require('bcrypt');
var bodyParser = require('body-parser');
const saltRounds = 10;
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJ_ID;
const SECRET_KEY = process.env.APPWRITE_SECRET;
const COLL_ID = 'oneid';
const { Query } = require('node-appwrite');
const mail = require('./mail');
const cors = require('cors');

app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Generate OTP
function generateOTP() {

    // Declare a digits variable 
    // which stores all digits
    var digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 6; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}

const sendOTP = async(email, otp) => {
    return mail({
        from: '"OneID Verification Team" <verify@oneid.ml>',
        to: [email],
        subject: `OneID Verification OTP: ${otp}`,
        html: `Thanks for creating your OneID! It'll really benefit you alot!
        <br> Your <b>OneID</b> One-Time-Password is <b>${otp}</b>.
        <br> After filling this OTP, you can use your OneID!
        <br> Please don't share this OTP with anyone.
        <br> If you received this email by mistake, please ignore it.`
    });
}

app.use(bodyParser.json())

// Init SDK
let client = new appwrite.Client();

let database = new appwrite.Database(client);

client
    .setEndpoint(APPWRITE_ENDPOINT) // Your API Endpoint
    .setProject(PROJECT_ID) // Your project ID
    .setKey(SECRET_KEY) // Your secret API key
;

/*(async() => {
    const hash = '$2b$10$ebMJ7xDSEcFRvi8cpKkyKu/d8HxZjA5ldZreJN.59DygNQ4kxkoGe';
    // Load hash from your password DB.
    const result1 = await bcrypt.compare(myPlaintextPassword, hash);
    // result1 == true
    console.log(result1);

    const result2 = await bcrypt.compare(someOtherPlaintextPassword, hash);
    // result2 == false
    console.log(result2);
})();*/

app.listen(PORT, (success, err) => {
    if (err) console.log(err);
    console.log(`Server listening on: ${PORT}`)
})

app.post('/register', async(req, res) => {
    const { name, oneid, email, pass } = req.body
    if (!name || !email || !pass || !oneid) {
        console.log('Missing parameters')
        res.status(400).json({
            message: 'Please fill all the fields'
        })
    } else {
        if (!oneid.endsWith('.1id')) {
            console.log(`OneID must end with .1id`)
            return res.status(401).json({ error: 'OneID must end with .1id' })
        } else {
            const salt = await bcrypt.genSalt(saltRounds);
            const hashedPass = await bcrypt.hash(pass, salt);
            const user = {
                name,
                oneid,
                email,
                password: hashedPass,
                data: JSON.stringify({}),
                verified: false
            }
            try {
                const data = await database.listDocuments(COLL_ID, [Query.equal('oneid', oneid)]);
                if (data.documents.length == 0) {
                    const result = await database.createDocument(COLL_ID, user.oneid, user);
                    console.log(result);
                    return res.status(201).json({
                        message: 'User created successfully',
                        data: result
                    });
                } else {
                    console.log(`OneID already exists`)
                    return res.status(401).json({ error: 'OneID already exists' })
                }
            } catch (err) {
                console.log(err)
                return res.status(500).json({ err: err });
            }
        }
    }
})

app.post('/login', async(req, res) => {
    const { oneid, pass } = req.body
    if (!oneid || !pass) {
        res.status(400).json({
            message: 'Please fill all the fields'
        })
    } else {
        if (!oneid.endsWith('.1id')) {
            return res.status(401).json({ error: 'OneID must end with .1id' })
        } else {
            try {
                const user = await database.getDocument(COLL_ID, oneid);
                if (user) {
                    const result = await bcrypt.compare(pass, user.password);
                    if (result) {
                        if (user.verified) {
                            return res.status(200).json({
                                message: 'User logged in successfully',
                                data: user
                            });
                        } else {
                            return res.status(200).json({ error: 'User not verified' })
                        }
                    } else {
                        return res.status(401).json({ error: 'Invalid password' })
                    }
                } else {
                    return res.status(401).json({ error: 'User not found' })
                }
            } catch (err) {
                console.log(err);
                return res.status(500).json({ err: err });
            }
        }
    }
});

app.post('/verify-mail', async(req, res) => {
    const { email } = req.body
    if (!email) {
        res.status(400).json({
            message: 'Please fill all the fields'
        })
    } else {
        const otp = generateOTP();
        await sendOTP(email, otp);
        console.log(`OTP ${otp} sent to ${email}`)
        return res.status(200).json({
            message: 'OTP sent successfully',
            otp: otp
        })
    }
})

app.post('/verify-user', async(req, res) => {
    const { oneid } = req.body;
    if (!oneid) {
        res.status(400).json({
            message: 'Please fill all the fields'
        })
    } else {
        try {
            const users = await database.listDocuments(COLL_ID, [Query.equal('oneid', oneid)]);
            if (users.length == 0) {
                res.status(401).json({ error: 'OneID not found' })
                console.log(`OneID not found`)

            } else {
                const user = users[0];
                if (user.verified) {
                    console.log(`OneID already verified`)
                    return res.status(401).json({ error: 'OneID already verified' })
                } else {
                    database.updateDocument(COLL_ID, user.id, { verified: true });
                    return res.status(200).json({ message: 'OneID verified successfully' })
                }
            }
        } catch (err) {
            console.log(err);
            return res.status(500).json({ err: err });
        }
    }
})

app.use(router)