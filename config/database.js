const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('notification', 'myuser', 'notificationadmin', {
  host: 'localhost',
  dialect: 'postgres'
});

module.exports = sequelize;
   