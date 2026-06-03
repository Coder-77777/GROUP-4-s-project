CREATE DATABASE group4_db;

USE group4_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    phone VARCHAR(50) UNIQUE NOT NULL,

    email VARCHAR(100),

    password_hash VARCHAR(255) NOT NULL,

    role VARCHAR(30) DEFAULT 'user',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE results (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    score INT,

    questions_attempted INT,

    time_taken INT,

    stored_until DATETIME,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);