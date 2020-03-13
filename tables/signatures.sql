-- if we update this file we need to RUN IT AGAIN to have an effect

DROP TABLE IF EXISTS signatures;

CREATE TABLE signatures (
    id SERIAL PRIMARY KEY,
    "first name" VARCHAR(255) NOT NULL CHECK("first name" != ''),
    "last name" VARCHAR(255) NOT NULL CHECK("last name" != ''),
    signature TEXT NOT NULL CHECK(signature != ''),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);