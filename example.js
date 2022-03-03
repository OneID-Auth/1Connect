var express = require('express'),
    app = express(),
    cookieparser = require('cookie-parser'),
    axios = require('axios'),
    API_ID = process.env.API_ID,
    API_TOKEN = process.env.API_TOKEN,
    ONEID_ENDPOINT = process.env.ONEID_ENDPOINT,
    ONEID_WEBSITE = process.env.ONEID_WEBSITE,
    SECRET = process.env.SECRET

// Main Route
app.get(`/`, function(req, res) {
    return axios.get(`${ONEID_WEBSITE}/1Sync`, {
            headers: {
                'Authorization': `Bearer ${API_ID} ${API_TOKEN}`,
            },
            params: {
                oneid: req.cookies.ONEID
            }
        })
        .then(function(response) {
            // res.send(response.data);
            const user = response.data;
            return res.send(req.cookies.oneid ? `<h1>Welcome ${user.name}</h1>` : `<h1>Please Login First</h1>`);
        })
        .catch(function(error) {
            // res.send(error);
        });
});

// Login Route
app.get(`/login`, function(req, res) {
    if (!req.cookies.oneid) {
        return res.redirect(`${ONEID_WEBSITE}/${ONEID_ENDPOINT}/1Connect`);
    } else {
        return res.redirect(`/`);
    }
});

// Logout Route
app.get(`/logout`, function(req, res) {
    res.clearCookie('oneid');
    return res.redirect(`/`);
});

// OneID 1Verify API
app.get(`/${ONEID_ENDPOINT}`, function(req, res) {

    const { TOKEN, ONEID } = req.params;

    let options = {
        maxAge: 60000, // would expire after 1 minutes
        signed: true,
        secret: `${SECRET}`
    }

    // Set cookie

    app.use(require('express-session')({ secret: `${SECRET}`, resave: true, saveUninitialized: true }));

    axios.post(`${ONEID_WEBSITE}/1Verify`, {
        headers: {
            'Authorization': `Bearer ${API_ID} ${API_TOKEN}`,
        },
        params: {
            token: TOKEN,
            oneid: ONEID
        }
    }).then(function(response) {
        if (response.data.status == "success") {
            res.cookie('oneid', ONEID, options);
            return res.redirect(`/`);
        } else {
            res.redirect(`/`);
        }
    }).catch(function(error) {
        res.status(500).send(error);
    });

});

app.listen(8080);