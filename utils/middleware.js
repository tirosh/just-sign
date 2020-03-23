exports.logReqRoute = (req, res, next) => {
    console.log(`${req.method}\t${req.url}`);
    next();
};

exports.makeCookiesSafe = (req, res, next) => {
    res.set('x-frame-options', 'DENY');
    res.locals.csrfToken = req.csrfToken();
    next();
};

exports.ifNotRegistered = (req, res, next) =>
    !req.session.id &&
    req.url != '/register' &&
    req.url != '/login' &&
    req.url != '/'
        ? res.redirect('/register')
        : next();

exports.ifLoggedIn = (req, res, next) =>
    req.session.id ? res.redirect('/sign') : next();

exports.ifNotSigned = (req, res, next) =>
    !req.session.signed ? res.redirect('/sign') : next();

exports.ifSigned = (req, res, next) =>
    req.session.signed ? res.redirect('/signed') : next();
