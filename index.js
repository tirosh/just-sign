const express = require('express');
const app = express();
module.exports = app;
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const { SESSION_SECRET: sessionSecret } = process.env.SESSION_SECRET
    ? process.env
    : require('./secrets.json');

const cookieSession = require('cookie-session');
const csurf = require('csurf');
const db = require('./utils/db.js');
const {
    logReqRoute,
    makeCookiesSafe,
    ifNotRegistered,
    ifLoggedIn,
    ifNotSigned,
    ifSigned
} = require('./utils/middleware.js');

// require bcrypt for hashing passwords
const { hash, compare } = require('./utils/bc.js');
const port = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
    cookieSession({
        secret: sessionSecret,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);
// protecting against CSRF attacks
app.use(csurf());

// serve static projects
app.use(express.static('./public'));

// EXPRESS HANDLEBARS ///////////////
let hbs = exphbs.create({
    helpers: { isdefined: value => value !== undefined }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// MIDDLEWARE ///////////////////////
app.use(logReqRoute);
app.use(makeCookiesSafe);
app.use(ifNotRegistered);

// GET / ////////////////////////////
app.get('/', ifLoggedIn, (req, res) => {
    res.render('home', {});
});

// GET /register ////////////////////
app.get('/register', ifLoggedIn, (req, res) => {
    res.render('register', {});
});
// POST /register
app.post('/register', ifLoggedIn, (req, res) => {
    const { first, last, email, psswd } = req.body;
    first === '' || last === '' || email === '' || psswd === ''
        ? res.render('sign', { first, last, email, psswd, alert: true })
        : hash(psswd)
              .then(hashdPsswd =>
                  db.upsert({
                      table: 'users',
                      items: {
                          first,
                          last,
                          email,
                          psswd: hashdPsswd
                      },
                      unique: 'email',
                      timestamp: true,
                      returnId: true
                  })
              )
              .then(dbData => {
                  Object.assign(req.session, {
                      userId: dbData.rows[0].id,
                      first,
                      last
                  });
                  res.redirect('/profile');
              })
              .catch(err => console.log('error in POST /register:', err));
});

// GET /login ///////////////////////
app.get('/login', ifLoggedIn, (req, res) => {
    res.render('login', {});
});
// POST /login
app.post('/login', ifLoggedIn, (req, res) => {
    const { email, psswd } = req.body;
    db.psswd(email)
        .then(dbData => dbData.rows[0].psswd)
        .then(hashdPsswd => compare(psswd, hashdPsswd))
        .then(match =>
            !match
                ? res.render('login', { email, alert: true })
                : db
                      .select({
                          columns:
                              'users.id, first, last, age, city, url, signatures.user_id',
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
                          where: 'email',
                          relation: '=',
                          arg: email
                      })
                      .then(dbData => {
                          dbData = dbData.rows[0];
                          if (dbData.user_id) req.session.signed = true;
                          delete dbData.user_id;
                          console.log('req.session:', req.session);
                          Object.assign(req.session, dbData);
                          console.log('req.session:', req.session);
                          if (req.session.signed) {
                              res.redirect('/signed');
                          } else {
                              res.redirect('/sign');
                          }
                      })
        )
        .catch(err => console.log('error in POST /login:', err));
});

// GET /profile /////////////////////
app.get('/profile', (req, res) => {
    res.render('profile', {});
});
// POST /profile
app.post('/profile', (req, res) => {
    const { age, city, url } = req.body;
    console.log('req.body:', req.body);
    db.upsert({
        table: 'profiles',
        items: {
            age,
            city,
            url,
            user_id: req.session.id
        },
        unique: 'user_id'
    })
        .then(() => res.redirect('/sign'))
        .catch(err => console.log('error in POST /register:', err));
});
// GET /profile/edit ////////////////
app.get('/profile/edit', (req, res) => {
    res.render('profileEdit', {});
});
// POST /profile/edit
app.post('/profile/edit', (req, res) => {
    res.render('profileEdit', { upserted: true });
});

// GET /sign ////////////////////////
app.get('/sign', ifSigned, (req, res) => {
    res.render('sign', {
        layout: 'main', // default, could be omitted
        first: req.session.first,
        last: req.session.last
    });
});
// POST /sign
app.post('/sign', ifSigned, (req, res) => {
    const { sign } = req.body;
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
                relation: '=',
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
        relation: 'IS NOT null'
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
        relation: '=',
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
app.post('/logout', (req, res) => {
    req.session.id = null;
    req.session.signed = null;
    res.redirect('/');
});

app.use((err, req, res, next) => {
    res.status(500);
    res.render('error', { error: err });
});

if (require.main == module)
    app.listen(port, () => console.log(`I'm listening on port: ${port}`));
