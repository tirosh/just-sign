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

const auth = (req, res, next) => {
    // return req.session.userId ? next() : res.redirect('/register');
    console.log('userId:', req.session.userId);
    console.log('signId:', req.session.signId);
    next();
    // return req.session.userId
    //     ? req.session.signId
    //         ? res.redirect('/thanks')
    //         : res.redirect('/petition')
    //     : res.redirect('/register');
};

// GET / redirect
app.get('/', auth, (req, res) => {
    res.redirect('/register');
});

// GET register
app.get('/register', (req, res) => {
    res.render('register', {});
});

// POST register
app.post('/register', (req, res) => {
    const { first, last, email, psswd } = req.body;
    first === '' || last === '' || email === '' || psswd === ''
        ? res.render('petition', {
              first: first,
              last: last,
              email: email,
              psswd: psswd,
              alert: true
          })
        : db
              .insert('users', { first, last, email, psswd })
              .then(dbData => {
                  console.log('dbData.rows[0].id:', dbData.rows[0].id);
                  req.session.userId = dbData.rows[0].id;
                  console.log('req.session.userId', req.session.userId);
                  res.redirect('/petition');
              })
              .catch(err => {
                  console.log('error in register:', err);
              });
});

// GET login
app.get('/login', (req, res) => {
    res.render('login', {});
});

// POST login
app.post('/login', (req, res) => {
    req.session.signId ? res.redirect('/thanks') : res.redirect('/petition');
});

// GET petition
app.get('/petition', (req, res) => {
    // if (req.session.signId) res.redirect('/thanks');
    db.select('users', ['first', 'last'], req.session.userId).then(dbData => {
        console.log('dbData.rows[0]:', dbData.rows[0]);
        res.render('petition', {
            layout: 'main', // default, could be omitted
            first: dbData.rows[0].first,
            last: dbData.rows[0].last
        });
    });
});

// POST sign
app.post('/petition', (req, res) => {
    const { sign } = req.body;
    // console.log('sign:', sign);
    sign === ''
        ? res.render('petition', { alert: true })
        : db
              .insert('signatures', { sign, user_id: req.session.userId })
              .then(dbData => {
                  req.session.signId = dbData.rows[0].id;
                  res.redirect('/thanks');
              })
              .catch(err => {
                  console.log('error in POST sign:', err);
              });
});

// GET thanks
app.get('/thanks', (req, res) => {
    Promise.all([
        db
            .select('users', ['first', 'last'], req.session.userId)
            .then(dbData => dbData.rows[0]),
        db
            .select('signatures', 'sign', req.session.userId)
            .then(dbData => dbData.rows[0].sign),
        db.count(req.session.signId).then(dbData => dbData.rows[0].count)
    ])
        .then(datArr =>
            res.render('thanks', {
                name: datArr[0],
                sign: datArr[1],
                count: parseInt(datArr[2], 10)
            })
        )
        .catch(err => console.log('Error in GET thanks:', err));
});

// GET signers
app.get('/signers', (req, res) => {
    db.select('users', ['first', 'last'])
        .then(dbData => res.render('signers', { signers: dbData.rows }))
        .catch(err => console.log('Error in getSigners:', err));
});

app.listen(port, () => console.log(`I'm listening on port: ${port}`));
