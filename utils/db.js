const spicedPg = require('spiced-pg');
const db = spicedPg(
    process.env.DATABASE_URL ||
        'postgres:postgres:postgres@localhost:5432/petition'
);

// UPSERT ///////////////////////////
module.exports.upsert = qObj => {
    if (qObj.timestamp) qObj.items.timestamp = 'NOW()';
    const rId = qObj.returnId ? 'RETURNING id' : '';

    const columns = Object.keys(qObj.items);
    const values = Object.values(qObj.items).map(
        val => (val === '' ? null : val) // if value '' convert to null
    );
    // console.log('upsert values:', values);

    const valIndex = [];
    const colValArr = [];

    for (let i = 0; i < values.length; i++) {
        valIndex.push(`$${i + 1}`);
        if (columns[i] !== qObj.unique)
            colValArr.push([columns[i], `$${i + 1}`].join('='));
    }

    const q = `
        INSERT INTO ${qObj.table} (${columns.toString()})
        VALUES (${valIndex.toString()})
        ON CONFLICT (${qObj.unique})
        DO UPDATE SET ${colValArr.toString()}        
        ${rId}
    `;
    console.log('UPSERT query: ', q);
    return db.query(q, values);
};

/* usage ****************************

// sample query object
// -------------------
const qObj = {
    table: 'table',
    items: {
        column1: 'value1',
        column2: 'value2',
        column3: 'value3'
    },
    unique: 'column3',
    timestamp: true,
    returnId: true
};

// sample query 
// ------------
INSERT INTO users (first, last, email, psswd)
VALUES ($1, $2, $3, $4)
ON CONFLICT (email)
DO UPDATE SET first=$1, last=$2, psswd=$4
RETURNING id

************************************/

// SELECT ///////////////////////////
module.exports.select = qObj => {
    let join = qObj.joins
        ? qObj.joins.map(obj => Object.values(obj).join(' ')).join(' ')
        : '';

    const q = `
        SELECT ${qObj.columns} 
        FROM ${qObj.from} 
        ${join}
        WHERE ${qObj.where} ${qObj.relation} ${qObj.arg ? '$1' : ''}
        `;
    console.log('select query: ', q);
    return qObj.arg ? db.query(q, [qObj.arg]) : db.query(q);
};

/* usage ****************************

// sample query object
// -------------------
const qObj = {
    columns: 'first, last, age, city, url, signatures.user_id',
    from: 'users',
    joins: [
        {
            type: 'LEFT JOIN',
            table: 'profiles',
            on: 'ON users.id = profiles.user_id'
        },
        {
            type: 'JOIN',
            table: 'signatures',
            on: 'ON users.id = profiles.user_id'
        }
    ],
    where: 'signatures.user_id',
    cond: 'IS NOT',
    selector: 'null'
};

// sample query 
// ------------
SELECT first, last, age, city, url, signatures.user_id
FROM users
LEFT JOIN profiles
ON users.id = profiles.user_id
LEFT JOIN signatures
ON users.id = signatures.user_id
WHERE signatures.user_id IS NOT NULL;

************************************/

// PSSWD ////////////////////////////
module.exports.psswd = email => {
    const q = `SELECT psswd FROM users WHERE email = $1`;
    return db.query(q, [email]);
};

// COUNT ////////////////////////////
module.exports.count = () => {
    const q = `SELECT COUNT(*) FROM signatures`;
    return db.query(q);
};

module.exports.getSigners = () => {
    const q = `SELECT first, last FROM signatures`;
    return db.query(q);
};

/////////////////////////////
// module.exports.select = (columns, table, column, condition, selector) => {
//     const q = `SELECT ${columns} FROM ${table} WHERE ${column} ${condition} $1`;
//     console.log('select query: ', q);
//     return db.query(q, [selector]);
// };

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
