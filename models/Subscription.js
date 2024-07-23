const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('notifications', {
  nickname: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: false
  },
  inventory_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  notification_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false  // По умолчанию уведомление не отправлено
  }
});

   

module.exports = Subscription;
