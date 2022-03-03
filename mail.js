const nodemailer = require('nodemailer');

// create transporter object with smtp server details
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.sendinblue.com',
    port: 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

transporter.verify(function(err, success) {
    if (err) { console.error(`SMTP Error: ${err}`); }
    if (success) {
        console.log("SMTP ready...");
    } else {
        console.error("SMTP not ready!");
    }
});

module.exports = transporter.sendMail.bind(transporter);