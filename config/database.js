const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_PUBLIC_URL, {
    dialect: 'postgres', // Указывайте явно диалект
    protocol: 'postgres', // Укажите протокол, если необходимо
    dialectOptions: {
        ssl: {
            require: true, // Если Railway требует SSL, установите этот флаг
            rejectUnauthorized: false // Отключите проверку сертификатов (если это нужно)
        }
    }
});

module.exports = sequelize;
