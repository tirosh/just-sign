const supertest = require('supertest');
const app = require('./index.js');
const cookieSession = require('cookie-session');

test('LOGGED OUT users are redirected to /register, when they attempt to /sign', () => {
    cookieSession.mockSession({});
    return supertest(app)
        .get('/sign')
        .then(res => {
            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toBe('register');
        });
});

test('LOGGED IN users are redirected to /sign, when they attempt to /login', () => {
    const mySession = { userId: true };
    cookieSession.mockSession(mySession);
    return supertest(app)
        .get('/login')
        .then(res => {
            expect(mySession.userId).toBe(true);
            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toBe('/sign');
        });
});

test('LOGGED IN users are redirected to /sign, when they attempt to /register', () => {
    const mySession = { userId: true };
    cookieSession.mockSession(mySession);
    return supertest(app)
        .get('/register')
        .then(res => {
            expect(mySession.userId).toBe(true);
            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toBe('/sign');
        });
});

test('LOGGED IN users who have SIGNED are redirected to /signed, when they attempt to /sign', () => {
    const mySession = { userId: true, signId: true };
    cookieSession.mockSession(mySession);
    return supertest(app)
        .get('/sign')
        .then(res => {
            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toBe('/signed');
        });
});

test('LOGGED IN users who have SIGNED are redirected to /signed, when they attempt to POST a /sign', () => {
    const mySession = { userId: true, signId: true };
    cookieSession.mockSession(mySession);
    return supertest(app)
        .post('/sign')
        .then(res => {
            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toBe('/signed');
        });
});

test('LOGGED IN users who have NOT SIGNED are redirected to /sign, when they attempt to /signed', () => {
    const mySession = { userId: true, signId: false };
    cookieSession.mockSession(mySession);
    return supertest(app)
        .get('/signed')
        .then(res => {
            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toBe('/sign');
        });
});

test('LOGGED IN users who have NOT SIGNED are redirected to /sign, when they attempt to /signed', () => {
    const mySession = { userId: true, signId: false };
    cookieSession.mockSession(mySession);
    return supertest(app)
        .get('/signers')
        .then(res => {
            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toBe('/sign');
        });
});
