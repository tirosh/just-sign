const spicedPg = require('spiced-pg');
const db = spicedPg(
    process.env.DATABASE_URL ||
        'postgres:postgres:postgres@localhost:5432/petition'
);
// require bcrypt for hashing passwords
const { hash, compare } = require('./bc');

// USER REGISTER ////////////////////
module.exports.registerUser = (first, last, email, psswd) => {
    const q = `
        INSERT INTO users (first, last, email, psswd)
        VALUES ($1, $2, $3, $4)
        RETURNING id`;
    return hash(psswd).then(hashdPsswd =>
        db.query(q, [first, last, email, hashdPsswd])
    );
};

// USER UPDATE //////////////////////
module.exports.updateUser = (...params) => {
    const str = params[4] === '' ? params.splice(4) : ', psswd=$5';
    const q = `
        UPDATE users
        SET first=$2, last=$3, email=$4 ${str}
        WHERE id=$1`;

    return params[4] === ''
        ? db.query(q, params)
        : hash(params[4]).then(hashdPsswd => {
              params[4] = hashdPsswd;
              return db.query(q, params);
          });
};

// LOGIN ////////////////////////////
module.exports.login = (email, psswd) => {
    const q = `
        SELECT users.id, first, last, email, age, city, url, signatures.user_id
        FROM users
        LEFT JOIN profiles
        ON users.id = profiles.user_id
        LEFT JOIN signatures
        ON users.id = signatures.user_id
        WHERE email = $1`;

    return getPsswd(email)
        .then(dbData =>
            dbData === undefined
                ? Promise.reject(`Email doesn't exist.`)
                : dbData.rows[0].psswd
        )
        .then(hashdPsswd => compare(psswd, hashdPsswd))
        .then(match =>
            match ? db.query(q, [email]) : Promise.reject(`Wrong password.`)
        );
};

// PROFILE //////////////////////////
module.exports.profile = (...params) => {
    console.log('params:', params);

    params = Object.values(params).map(val => (val === '' ? null : val));
    console.log('params:', params);

    const q = `
        INSERT INTO profiles (user_id, age, city, url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) 
        DO UPDATE SET age=$2, city=$3, url=$4`;
    return db.query(q, params);
};

// SIGN ADD /////////////////////////
module.exports.addSign = (id, sign) => {
    const q = `
        INSERT INTO signatures (user_id, sign)
        VALUES ($1, $2)`;
    return db.query(q, [id, sign]);
};

// PSSWD ////////////////////////////
const getPsswd = email => {
    const q = `SELECT psswd FROM users WHERE email = $1`;
    return db.query(q, [email]);
};

// DELETE SIGN //////////////////////
module.exports.deleteSign = id => {
    const q = `DELETE FROM signatures WHERE user_id = $1`;
    return db.query(q, [id]);
};

// COUNT ////////////////////////////
module.exports.count = table => {
    const q = `SELECT COUNT(*) FROM ${table}`;
    return db.query(q);
};

///////////////////////////////////////////////////////////////////////////
// UPSERT ///////////////////////////
module.exports.upsert = qObj => {
    // console.log('qObj.itmes:', qObj.items);
    // for (const item in qObj.items) {
    //     if (qObj.items[item] === '') delete qObj.items[item];
    // }
    // console.log('qObj.itmes:', qObj.items);
    // console.log('qObj.items.psswd:', qObj.items.psswd);
    // if (qObj.items.psswd == '') delete qObj.items.psswd;

    if (qObj.timestamp) qObj.items.timestamp = 'NOW()';
    const rId = qObj.returnId ? 'RETURNING id' : '';

    const columns = Object.keys(qObj.items);
    const values = Object.values(qObj.items).map(
        val => (val === '' ? null : val) // if value '' convert to null
    );
    console.log('upsert values:', values);

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
        WHERE ${qObj.where} ${qObj.cond} ${qObj.arg ? '$1' : ''}
        `;
    console.log('SELECT query: ', q);
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
    relation: 'IS NOT',
    arg: 'null'
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
