const express = require('express');
const hb = require('express-handlebars');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const db = require('./db.js');
const app = express();
const port = 8080;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
    cookieSession({
        secret: `Poor, angry Chicken`,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

// configure express to use express-handlebars
app.engine('handlebars', hb());
app.set('view engine', 'handlebars');

// tell app to serve static projects
app.use(express.static('./public'));

app.use((req, res, next) => {
    console.log(`${req.method} request to ${req.url}
-----------------------------------------------\n`);
    next();
});

// GET home
app.get('/', (req, res) => {
    res.render('home', {
        layout: 'main' // default, could be omitted
    });
});

// POST sign
app.post('/sign', (req, res) => {
    const { firstname, lastname, signature } = req.body;
    db.addSignature(firstname, lastname, signature)
        .then(dbData => {
            req.session.signatureId = dbData.rows[0].id;
            res.redirect('/thanks');
        })
        .catch(err => console.log('error in addSignature:', err));
});

// GET thanks
app.get('/thanks', (req, res) => {
    db.getSignature(req.session.signatureId)
        .then(dbData => {
            const signature = dbData.rows[0].signature;
            res.render('thanks', { signature });
        })
        .catch(err => console.log('error in getSignature:', err));
});

app.get('/signatures', (req, res) => {
    console.log('made it to the GET signatures route..');
    db.getAllSignatures()
        .then(signatures => console.log('signatures:', signatures.rows))
        .catch(err => console.log('error in getSignatures:', err));
});

app.listen(port, () => console.log(`I'm listening on port: ${port}`));
