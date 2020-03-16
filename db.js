const spicedPg = require('spiced-pg');
const db = spicedPg('postgres:postgres:postgres@localhost:5432/petition');

module.exports.addSignature = (firstName, lastName, signature) => {
    const q = `
        INSERT INTO signatures("first name", "last name", signature, timestamp)
        VALUES ($1, $2, $3, NOW()) RETURNING id
    `;
    const params = [firstName, lastName, signature];
    return db.query(q, params);
};

module.exports.getSignature = id => {
    const q = `SELECT signature FROM signatures WHERE id = $1`;
    return db.query(q, [id]);
};

module.exports.getCount = () => {
    const q = `SELECT COUNT(*) FROM signatures`;
    return db.query(q);
};

module.exports.getFirstname = () => {
    const q = `SELECT "first name" FROM signatures`;
    return db.query(q);
};

module.exports.getLastname = () => {
    const q = `SELECT "last name" FROM signatures`;
    return db.query(q);
};
