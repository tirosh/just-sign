const spicedPg = require('spiced-pg');
const db = spicedPg('postgres:postgres:postgres@localhost:5432/petition');

module.exports.insert = (table, userInpt) => {
    const keys = Object.keys(userInpt);
    keys.push('timestamp');

    const values = Object.values(userInpt);
    const valIndex = ['NOW()'];
    for (let i = values.length; i > 0; i--) {
        valIndex.unshift(`$${i}`);
    }

    const q = `
        INSERT INTO ${table} (${keys.toString()})
        VALUES (${valIndex.toString()}) RETURNING id
    `;
    console.log('insert query: ', q);
    return db.query(q, values);
};

module.exports.select = (table, columns, id) => {
    const idType = table === 'signatures' ? 'user_id' : 'id';
    const ident = id ? ` WHERE ${idType} = ${id}` : '';

    const q = `SELECT ${columns.toString()} FROM ${table} ${ident}`;
    console.log('select query: ', q);
    return db.query(q);
};

// module.exports.addSign = sign => {
//     const q = `
//         INSERT INTO signatures(first, last, sign, timestamp)
//         VALUES ($1, $2, $3, NOW()) RETURNING id
//     `;
//     const params = [sign];
//     return db.query(q, params);
// };

// module.exports.getSign = id => {
//     const q = `SELECT sign FROM signatures WHERE id = $1`;
//     return db.query(q, [id]);
// };

module.exports.count = () => {
    const q = `SELECT COUNT(*) FROM signatures`;
    return db.query(q);
};

module.exports.getSigners = () => {
    const q = `SELECT first, last FROM signatures`;
    return db.query(q);
};
