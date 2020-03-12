const spicedPg = require('spiced-pg');
const db = spicedPg('postgres:postgres:postgres@localhost:5432/cities');

module.exports.addCity = (city, country, population) => {
    const q = `
        INSERT into locations(city, country, population)
        VALUES ($1, $2, $3)
    `;
    const params = [city, country, population];
    return db.query(q, params);
};

module.exports.getCities = () => {
    const q = `SELECT * FROM locations`;
    return db.query(q);
};
