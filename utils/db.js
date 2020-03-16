const spicedPg = require('spiced-pg');
const db = spicedPg('postgres:postgres:postgres@localhost:5432/petition');

module.exports.addSign = (first, last, sign) => {
    const q = `
        INSERT INTO signatures(first, last, sign, timestamp)
        VALUES ($1, $2, $3, NOW()) RETURNING id
    `;
    const params = [first, last, sign];
    return db.query(q, params);
};

module.exports.getSign = id => {
    const q = `SELECT sign FROM signatures WHERE id = $1`;
    return db.query(q, [id]);
};

module.exports.getCount = () => {
    const q = `SELECT COUNT(*) FROM signatures`;
    return db.query(q);
};

module.exports.getFirst = () => {
    const q = `SELECT first FROM signatures`;
    return db.query(q);
};

module.exports.getLast = () => {
    const q = `SELECT last FROM signatures`;
    return db.query(q);
};
