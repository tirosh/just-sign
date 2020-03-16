const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const csurf = require('csurf');
const db = require('./db.js');
const app = express();
const port = 8080;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
    cookieSession({
        secret: `Poor, angry Chicken`,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);
// protecting against CSRF attacks
app.use(csurf());

//
app.use((req, res, next) => {
    console.log(`${req.method} request to ${req.url}
-----------------------------------------------\n`);
    res.set('x-frame-options', 'DENY');
    res.locals.csrfToken = req.csrfToken();
    next();
});

// configure express to use express-handlebars
var hbs = exphbs.create({
    // Specify helpers which are only registered on this instance.
    helpers: { isdefined: value => value !== undefined }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// tell app to serve static projects
app.use(express.static('./public'));

// redirect GET /
app.get('/', (req, res) => {
    req.session.signatureId
        ? res.redirect('/thanks')
        : res.redirect('/petition');
});

// GET petition
app.get('/petition', (req, res) => {
    res.render('petition', {
        layout: 'main' // default, could be omitted
    });
});

// POST sign
app.post('/petition', (req, res) => {
    const { firstname, lastname, signature } = req.body;
    firstname === '' || lastname === '' || signature === ''
        ? res.render('petition', {
              firstname: firstname,
              lastname: lastname,
              backdrop: `
              <img src="${signature}" alt="signature">`,
              alert: `
              <div class="alert">Please provide first name, last name and signature.</div>`
          })
        : db
              .addSignature(firstname, lastname, signature)
              .then(dbData => {
                  req.session.signatureId = dbData.rows[0].id;
                  res.redirect('/thanks');
              })
              .catch(err => {
                  console.log('error in addSignature:', err);
              });
});

// GET thanks
app.get('/thanks', (req, res) => {
    Promise.all([
        db
            .getSignature(req.session.signatureId)
            .then(dbData => dbData.rows[0].signature),
        db
            .getCount(req.session.signatureId)
            .then(dbData => dbData.rows[0].count)
    ])
        .then(datArr => {
            const signature = datArr[0];
            const count = parseInt(datArr[1], 10);
            res.render('thanks', { signature, count });
        })
        .catch(err => console.log('Error in getSignature /getCount:', err));
});

// GET signers
app.get('/signers', (req, res) => {
    Promise.all([
        db.getFirstname(req.session.signatureId).then(dbData => dbData.rows),
        db.getLastname(req.session.signatureId).then(dbData => dbData.rows)
    ])
        .then(datArr => {
            const firstNames = datArr[0];
            const lastNames = datArr[1];
            // console.log('firstNames:', firstNames);
            // console.log('lastNames:', lastNames);

            const signers = [];
            for (let i = 0; i < firstNames.length; i++) {
                signers.push(Object.assign(firstNames[i], lastNames[i]));
            }
            // console.log('signers:', signers);

            res.render('signers', { signers });
            // res.end();
        })
        .catch(err => console.log('Error in getFirstname /getLastname:', err));
});

app.listen(port, () => console.log(`I'm listening on port: ${port}`));
