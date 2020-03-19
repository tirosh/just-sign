exports.logReqRoute = (req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
};

exports.makeCookiesSafe = (req, res, next) => {
    res.set('x-frame-options', 'DENY');
    res.locals.csrfToken = req.csrfToken();
    next();
};

exports.ifNotRegistered = (req, res, next) =>
    !req.session.userId && req.url != '/register' && req.url != '/login'
        ? res.redirect('register')
        : next();

exports.ifLoggedIn = (req, res, next) =>
    req.session.userId ? res.redirect('/sign') : next();

exports.ifNotSigned = (req, res, next) =>
    !req.session.signId ? res.redirect('/sign') : next();

exports.ifSigned = (req, res, next) =>
    req.session.signId ? res.redirect('/signed') : next();
