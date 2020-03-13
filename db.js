const spicedPg = require('spiced-pg');
const db = spicedPg('postgres:postgres:postgres@localhost:5432/petition');

module.exports.addSignature = (firstName, lastName, signiture) => {
    const q = `
        INSERT INTO signatures("first name", "last name", signature, timestamp)
        VALUES ($1, $2, $3, NOW()) RETURNING id
    `;
    const params = [firstName, lastName, signiture];
    return db.query(q, params);
};

module.exports.getSignature = id => {
    const q = `SELECT signature FROM signatures WHERE id = $1`;
    return db.query(q, [id]);
};

module.exports.getAllSignatures = () => {
    const q = `SELECT * FROM signatures`;
    return db.query(q);
};
