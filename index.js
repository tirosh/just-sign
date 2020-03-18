const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');

const cookieSession = require('cookie-session');
const csurf = require('csurf');
const db = require('./utils/db.js');

// require bcrypt for hashing passwords
const { hash, compare } = require('./utils/bc.js');
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

// configure express to use express-handlebars
let hbs = exphbs.create({
    // Specify helpers which are only registered on this instance.
    helpers: { isdefined: value => value !== undefined }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// serve static projects
app.use(express.static('./public'));

// MIDDLEWARE ///////////////////////
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    res.set('x-frame-options', 'DENY');
    res.locals.csrfToken = req.csrfToken();
    next();
});

// AUTH /////////////////////////////
const auth = (req, res, next) =>
    req.session.userId ? next() : res.redirect('/register');

// GET / ////////////////////////////
app.get('/', auth, (req, res) => {
    res.redirect('/register');
});

// GET register /////////////////////
app.get('/register', (req, res) => {
    if (req.session.signId) return res.redirect('/signed');
    res.render('register', {});
});
// POST register
app.post('/register', (req, res) => {
    const { first, last, email, psswd } = req.body;
    first === '' || last === '' || email === '' || psswd === ''
        ? res.render('sign', { first, last, email, psswd, alert: true })
        : hash(psswd)
              .then(hashdPsswd =>
                  db.insert(
                      'users',
                      { first, last, email, psswd: hashdPsswd },
                      true
                  )
              )
              .then(dbData => {
                  Object.assign(req.session, {
                      userId: dbData.rows[0].id,
                      first,
                      last
                  });
                  res.redirect('/profile');
              })
              .catch(err => console.log('error in POST register:', err));
});

// GET profile //////////////////////
app.get('/profile', auth, (req, res) => {
    res.render('profile', {});
});
// POST profile
app.post('/profile', (req, res) => {
    const { age, city, url } = req.body;
    db.insert('profiles', { age, city, url, user_id: req.session.userId })
        .then(() => res.redirect('/sign'))
        .catch(err => console.log('error in POST register:', err));
});

// GET login ////////////////////////
app.get('/login', (req, res) => {
    res.render('login', {});
});
// POST login
app.post('/login', (req, res) => {
    const { email, psswd } = req.body;
    db.psswd(email)
        .then(dbData => dbData.rows[0].psswd)
        .then(hashdPsswd => compare(psswd, hashdPsswd))
        .then(match => {
            if (!match) return res.render('login', { alert: true });
        })
        .then(() => db.select('first, last, id', 'users', 'email', '=', email))
        .then(dbData => {
            req.session.userId = dbData.rows[0].id;
            req.session.first = dbData.rows[0].first;
            req.session.last = dbData.rows[0].last;
            res.redirect('/sign');
        });
});

// GET logout ////////////////////////
app.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/');
});

// GET sign /////////////////////
app.get('/sign', auth, (req, res) => {
    if (req.session.signId) return res.redirect('/signed');
    res.render('sign', {
        layout: 'main', // default, could be omitted
        first: req.session.first,
        last: req.session.last
    });
});
// POST sign
app.post('/sign', (req, res) => {
    const { sign } = req.body;
    sign === ''
        ? res.render('sign', { alert: true })
        : db
              .insert('signatures', { sign, user_id: req.session.userId }, true)
              .then(dbData => {
                  req.session.signId = dbData.rows[0].id;
                  res.redirect('/signed');
              })
              .catch(err => {
                  console.log('error in POST sign:', err);
              });
});

// GET signed ///////////////////////
app.get('/signed', auth, (req, res) => {
    Promise.all([
        db
            .select('sign', 'signatures', 'id', '=', req.session.userId)
            .then(dbData => dbData.rows[0].sign),
        db.count(req.session.signId).then(dbData => dbData.rows[0].count)
    ])
        .then(datArr =>
            res.render('signed', {
                first: req.session.first,
                last: req.session.last,
                sign: datArr[0],
                count: parseInt(datArr[1], 10)
            })
        )
        .catch(err => console.log('Error in GET signed:', err));
});

// GET signers //////////////////////
app.get('/signers', auth, (req, res) => {
    db.selectJoin({
        columns: 'first, last, age, city, url, signatures.user_id',
        from: 'users',
        joins: [
            {
                type: 'LEFT JOIN',
                table: 'profiles',
                on: 'ON users.id = profiles.user_id'
            },
            {
                type: 'LEFT JOIN',
                table: 'signatures',
                on: 'ON users.id = profiles.user_id'
            }
        ],
        where: 'signatures.user_id',
        cond: 'IS NOT NULL'
    })
        .then(dbData => res.render('signers', { signers: dbData.rows }))
        .catch(err => console.log('Error in getSigners:', err));
});

app.listen(port, () => console.log(`I'm listening on port: ${port}`));
