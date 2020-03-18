const spicedPg = require('spiced-pg');
const db = spicedPg('postgres:postgres:postgres@localhost:5432/petition');

module.exports.insert = (table, userInpt, timestamp) => {
    if (timestamp) userInpt.timestamp = 'NOW()';
    const columns = Object.keys(userInpt).toString();
    const values = Object.values(userInpt);
    const valIndex = [];
    for (let i = values.length; i > 0; i--) {
        valIndex.unshift(`$${i}`);
    }
    const q = `
        INSERT INTO ${table} (${columns})
        VALUES (${valIndex.toString()}) 
        RETURNING id
    `;
    // console.log('insert query: ', q);
    return db.query(q, values);
};

module.exports.psswd = email => {
    const q = `SELECT psswd FROM users WHERE email = $1`;
    return db.query(q, [email]);
};

module.exports.select = (columns, table, column, condition, selector) => {
    const q = `SELECT ${columns} FROM ${table} WHERE ${column} ${condition} $1`;
    console.log('select query: ', q);
    return db.query(q, [selector]);
};

// SELECT first, last, age, city, url, signatures.user_id
// FROM users
// LEFT JOIN profiles
// ON users.id = profiles.user_id
// LEFT JOIN signatures
// ON users.id = signatures.user_id
// WHERE signatures.user_id IS NOT NULL;

module.exports.selectJoin = qObj => {
    let join = '';
    if (qObj.joins) {
        qObj.joins.forEach(obj => (join += Object.values(obj).join(' ') + ' '));
    }
    console.log('qObj.selector:', qObj.selector);

    const q = `
        SELECT ${qObj.columns} 
        FROM ${qObj.from} 
        ${join}
        WHERE ${qObj.where} ${qObj.cond}`;
    console.log('selectJoin query: ', q);
    return db.query(q);
};

// module.exports.select = (table, columns, id) => {
//     const idType = table === 'signatures' ? 'user_id' : 'id';
//     const ident = id ? ` WHERE ${idType} = ${id}` : '';

//     const q = `SELECT ${columns.toString()} FROM ${table} ${ident}`;
//     console.log('select query: ', q);
//     return db.query(q);
// };

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
