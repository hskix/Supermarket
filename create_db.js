const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'c372_supermarketdb';

async function createDatabaseAndTables() {
  let conn;
  try {
    conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD });
    console.log(`Connected to MySQL server ${DB_HOST} as ${DB_USER}`);

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`Database '${DB_NAME}' ensured`);

    // switch to the database
    await conn.changeUser({ database: DB_NAME });

    // Create tables
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        address TEXT,
        contact VARCHAR(50),
        role VARCHAR(50) DEFAULT 'customer'
      ) ENGINE=InnoDB;
    `);
    console.log('Table users ensured');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        productName VARCHAR(255) NOT NULL,
        quantity INT DEFAULT 0,
        price DECIMAL(10,2) DEFAULT 0.00,
        image VARCHAR(255)
      ) ENGINE=InnoDB;
    `);
    console.log('Table products ensured');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT DEFAULT 1,
        unit_price DECIMAL(10,2) DEFAULT 0.00,
        UNIQUE KEY unique_user_product (user_id, product_id)
      ) ENGINE=InnoDB;
    `);
    console.log('Table cart_items ensured');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        total DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('Table orders ensured');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        product_id INT,
        product_name VARCHAR(255),
        quantity INT DEFAULT 1,
        unit_price DECIMAL(10,2) DEFAULT 0.00
      ) ENGINE=InnoDB;
    `);
    console.log('Table order_items ensured');

    console.log('All tables created/verified successfully');
  } catch (err) {
    console.error('Error creating database or tables:', err);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

createDatabaseAndTables();
