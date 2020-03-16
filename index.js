const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');

const cookieSession = require('cookie-session');
const csurf = require('csurf');
const db = require('./utils/db.js');

// require bcrypt for hashing passwords
const { hash, compare } = require('./utils/bcrypt.js');
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
    console.log(`${req.method} request to ${req.url}`);
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
    req.session.signId ? res.redirect('/thanks') : res.redirect('/petition');
});

// GET petition
app.get('/petition', (req, res) => {
    res.render('petition', {
        layout: 'main' // default, could be omitted
    });
});

// POST sign
app.post('/petition', (req, res) => {
    const { first, last, sign } = req.body;
    first === '' || last === '' || sign === ''
        ? res.render('petition', {
              first: first,
              last: last,
              backdrop: sign,
              alert: true
          })
        : db
              .addSign(first, last, sign)
              .then(dbData => {
                  req.session.signId = dbData.rows[0].id;
                  res.redirect('/thanks');
              })
              .catch(err => {
                  console.log('error in addSign:', err);
              });
});

// GET thanks
app.get('/thanks', (req, res) => {
    Promise.all([
        db.getSign(req.session.signId).then(dbData => dbData.rows[0].sign),
        db.getCount(req.session.signId).then(dbData => dbData.rows[0].count)
    ])
        .then(datArr => {
            const sign = datArr[0];
            const count = parseInt(datArr[1], 10);
            res.render('thanks', { sign, count });
        })
        .catch(err => console.log('Error in getSign /getCount:', err));
});

// GET signers
app.get('/signers', (req, res) => {
    Promise.all([
        db.getFirst(req.session.signId).then(dbData => dbData.rows),
        db.getLast(req.session.signId).then(dbData => dbData.rows)
    ])
        .then(datArr => {
            const firstnames = datArr[0];
            const lastnames = datArr[1];
            console.log('firstnames:', firstnames);
            console.log('lastnames:', lastnames);

            const signers = [];
            for (let i = 0; i < firstnames.length; i++) {
                signers.push(Object.assign(firstnames[i], lastnames[i]));
            }
            res.render('signers', { signers });
        })
        .catch(err => console.log('Error in getFirst /getLast:', err));
});

app.listen(port, () => console.log(`I'm listening on port: ${port}`));
