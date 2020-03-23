const express = require('express');
const app = (module.exports.app = express());
const port = process.env.PORT || 8080;

const { SESSION_SECRET: sessionSecret } = process.env.SESSION_SECRET
    ? process.env
    : require('./secrets.json');
const regexUrl = /^(http|https):\/\/[^ "]+$/;

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
    res.render('home', { layout: 'blank' });
});

// GET /register ////////////////////
app.get('/register', ifLoggedIn, (req, res) => {
    res.render('register', { layout: 'blank' });
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
    res.render('login', { layout: 'blank' });
});
// POST /login
app.post('/login', ifLoggedIn, (req, res) => {
    const { email, psswd } = req.body;
    db.login(email, psswd)
        .then(dbData =>
            dbData === undefined
                ? res.render('login', { layout: 'blank', email, alert: true })
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
        .catch(err => {
            console.log('error in POST /login:', err);
            res.render('login', { layout: 'blank', email, alert: err });
        });
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
    Promise.all([
        db.updateUser(req.session.id, first, last, email, psswd),
        db.profile(req.session.id, age, city, url)
    ])
        .then(() => {
            Object.assign(req.session, { first, last, email, age, city, url });
            res.redirect('/sign');
        })
        .catch(err => console.log('error in POST /profile/edit:', err));
});

// GET /sign ////////////////////////
app.get('/sign', ifSigned, (req, res) => {
    const { first, last } = req.session;
    res.render('sign', { first, last });
});
// POST /sign
app.post('/sign', ifSigned, (req, res) => {
    const { first, last } = req.session;
    const { sign } = req.body;
    sign !== ''
        ? db
              .addSign(req.session.id, sign)
              .then(() => {
                  req.session.signed = true;
                  res.redirect('/signed');
              })
              .catch(err => {
                  console.log('error in POST /sign:', err);
              })
        : res.render('sign', { first, last, alert: true });
});

// GET /signed //////////////////////
app.get('/signed', ifNotSigned, (req, res) => {
    Promise.all([
        db.getSign(req.session.id).then(dbData => dbData.rows[0].sign),
        db.countSigns().then(dbData => dbData.rows[0].count)
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
    db.getSigners()
        .then(dbData =>
            dbData.rows.map(signer => {
                if (!regexUrl.test(signer.url)) delete signer.url;
                return signer;
            })
        )
        .then(signers => res.render('signers', { signers }))
        .catch(err => console.log('Error in GET /signers:', err));
});

// GET /signers/:city ////////////////
app.get('/signers/:city', ifNotSigned, (req, res) => {
    db.getSigners(req.params.city)
        .then(dbData =>
            dbData.rows.map(signer => {
                if (!regexUrl.test(signer.url)) delete signer.url;
                return signer;
            })
        )
        .then(signers => res.render('signers', { signers }))
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
