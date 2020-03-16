-- if we update this file we need to RUN IT AGAIN to have an effect

DROP TABLE IF EXISTS signatures;
CREATE TABLE signatures (
    id SERIAL PRIMARY KEY,
    first VARCHAR(255) NOT NULL CHECK(first  != ''),
    last VARCHAR(255) NOT NULL CHECK(last != ''),
    sign TEXT NOT NULL CHECK(sign != ''),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first VARCHAR(255) NOT NULL CHECK(first  != ''),
    last VARCHAR(255) NOT NULL CHECK(last != ''),
    email VARCHAR(255) UNIQUE NOT NULL CHECK(email != ''),
    psswd VARCHAR(255) NOT NULL CHECK(psswd != ''),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
