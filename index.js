const express = require('express');
const app = (module.exports.app = express());
const port = process.env.PORT || 8080;

const { SESSION_SECRET: sessionSecret } = process.env.SESSION_SECRET
    ? process.env
    : require('./secrets.json');

// require db to handle sql queries
const db = require('./utils/db.js');

// serve static files
app.use(express.static('./public'));

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const cookieSession = require('cookie-session');
app.use(
    cookieSession({
        secret: sessionSecret,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

// protecting against CSRF attacks
const csurf = require('csurf');
app.use(csurf());

// EXPRESS HANDLEBARS ///////////////
const exphbs = require('express-handlebars');
let hbs = exphbs.create({
    helpers: { isdefined: value => value !== undefined }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// MIDDLEWARE ///////////////////////
const {
    logReqRoute,
    makeCookiesSafe,
    ifNotRegistered,
    ifLoggedIn,
    ifNotSigned,
    ifSigned
} = require('./utils/middleware.js');
app.use(logReqRoute);
app.use(makeCookiesSafe);
app.use(ifNotRegistered);

// GET / ////////////////////////////
app.get('/', ifLoggedIn, (req, res) => {
    res.render('home');
});

// GET /register ////////////////////
app.get('/register', ifLoggedIn, (req, res) => {
    res.render('register');
});
// POST /register
app.post('/register', ifLoggedIn, (req, res) => {
    const { first, last, email, psswd } = req.body;
    db.registerUser(first, last, email, psswd)
        .then(dbData => dbData.rows[0].id)
        .then(id => {
            Object.assign(req.session, { id, first, last, email });
            res.redirect('/profile');
        })
        .catch(err => console.log('error in POST /register:', err));
});

// GET /login ///////////////////////
app.get('/login', ifLoggedIn, (req, res) => {
    res.render('login');
});
// POST /login
app.post('/login', ifLoggedIn, (req, res) => {
    const { email, psswd } = req.body;
    db.login(email, psswd)
        .then(dbData =>
            dbData === undefined
                ? res.render('login', { email, alert: true })
                : dbData.rows[0]
        )
        .then(user => {
            if (user.user_id) req.session.signed = true;
            delete user.user_id;
            Object.assign(req.session, user);
            req.session.signed
                ? res.redirect('/signed')
                : res.redirect('/sign');
        })
        .catch(err => console.log('error in POST /login:', err));
});

// GET /profile /////////////////////
app.get('/profile', (req, res) => {
    res.render('profile');
});
// POST /profile
app.post('/profile', (req, res) => {
    const { age, city, url } = req.body;
    db.profile(req.session.id, age, city, url)
        .then(() => {
            Object.assign(req.session, { age, city, url });
            res.redirect('/sign');
        })
        .catch(err => console.log('error in POST /profile:', err));
});
// GET /profile/edit ////////////////
app.get('/profile/edit', (req, res) => {
    const { first, last, email, age, city, url } = req.session;
    const userInfo = { first, last, email, age, city, url };
    res.render('profile_edit', userInfo);
});
// POST /profile/edit
app.post('/profile/edit', (req, res) => {
    const { first, last, email, psswd, age, city, url } = req.body;
    const userInfo = { first, last, email, age, city, url };

    Promise.all([
        db.updateUser(req.session.id, first, last, email, psswd),
        db.profile(req.session.id, age, city, url)
    ])
        .then(() => {
            console.log('made it to updateUser');

            Object.assign(req.session, userInfo);
            console.log('req.session:', req.session);
            res.redirect('/sign');
        })
        .catch(err => console.log('error in POST /profile/edit:', err));
});

// GET /sign ////////////////////////
app.get('/sign', ifSigned, (req, res) => {
    res.render('sign', { first: req.session.first, last: req.session.last });
});
// POST /sign
app.post('/sign', ifSigned, (req, res) => {
    const { sign } = req.body;
    console.log('sign :', sign);

    sign === ''
        ? res.render('sign', { alert: true })
        : db
              .upsert({
                  table: 'signatures',
                  items: {
                      sign,
                      user_id: req.session.id
                  },
                  unique: 'user_id',
                  timestamp: true
              })
              .then(() => {
                  req.session.signed = true;
                  res.redirect('/signed');
              })
              .catch(err => {
                  console.log('error in POST /sign:', err);
              });
});

// GET /signed //////////////////////
app.get('/signed', ifNotSigned, (req, res) => {
    Promise.all([
        db
            .select({
                columns: 'sign',
                from: 'signatures',
                where: 'user_id',
                cond: '=',
                arg: req.session.id
            })
            .then(dbData => dbData.rows[0].sign),
        db.count('signatures').then(dbData => dbData.rows[0].count)
    ])
        .then(datArr =>
            res.render('signed', {
                first: req.session.first,
                last: req.session.last,
                sign: datArr[0],
                count: parseInt(datArr[1], 10)
            })
        )
        .catch(err => console.log('Error in GET /signed:', err));
});
// POST /sign/delete
app.post('/sign/delete', ifNotSigned, (req, res) => {
    db.deleteSign(req.session.id)
        .then(() => {
            req.session.signed = false;
            res.redirect('/sign');
        })
        .catch(err => console.log('error in POST /sign/delete:', err));
});

// GET /signers /////////////////////
app.get('/signers', ifNotSigned, (req, res) => {
    db.select({
        columns: 'first, last, age, city, url',
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
                on: 'ON users.id = signatures.user_id'
            }
        ],
        where: 'signatures.user_id',
        cond: 'IS NOT null'
    })
        .then(dbData => {
            const regex = /^(http|https):\/\/[^ "]+$/;
            const signers = dbData.rows.map(signer => {
                if (!regex.test(signer.url)) delete signer.url;
                return signer;
            });
            res.render('signers', { signers });
        })
        .catch(err => console.log('Error in GET /signers:', err));
});

// GET /signers //////////////////////
app.get('/signers/:city', ifNotSigned, (req, res) => {
    console.log('req.params.city:', req.params.city);
    db.select({
        columns: 'first, last, age, city, url',
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
                on: 'ON users.id = signatures.user_id'
            }
        ],
        where: 'city',
        cond: '=',
        arg: req.params.city
    })
        .then(dbData => {
            const regex = /^(http|https):\/\/[^ "]+$/;
            const signers = dbData.rows.map(signer => {
                if (!regex.test(signer.url)) delete signer.url;
                return signer;
            });
            res.render('signers', { signers });
        })
        .catch(err => console.log('Error in GET /signers/:city :', err));
});

// GET /logout ///////////////////////
app.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/signed');
});

app.use((err, req, res, next) => {
    res.status(500);
    res.render('error', { error: err });
});

if (require.main == module)
    app.listen(port, () => console.log(`I'm listening on port: ${port}`));
