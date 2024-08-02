const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const sequelize = require('../config/database');
const Subscription = require('../models/Subscription');

const app = express();
const PORT = process.env.PORT_CHECKER || 5000;

const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
const shopifyStore = process.env.SHOPIFY_STORE;

// Настройка транспорта для отправки писем
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: 'support@onkron.co.uk',
    pass: 'acbr zfpu anlr sibh'
  }
});

// Middleware для обработки JSON
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Проверка наличия продукта
async function checkProductAvailability() {
    console.log("Checking prdoucts")
  try {
    const subscriptions = await Subscription.findAll();
    for (const subscription of subscriptions) {
      console.log(`Checking product availability for subscription: ${JSON.stringify(subscription)}`);
      console.log(`https://${shopifyStore}/admin/api/2023-04/products/${subscription.inventory_id}.json`)
      const response = await axios.get(`https://${shopifyStore}/admin/api/2023-04/products/${subscription.inventory_id}.json`, {
        headers: {
          'X-Shopify-Access-Token': shopifyAccessToken
        }
      });

      const product = response.data.product;

      if (product) {
        const availableVariants = product.variants.filter(variant => variant.inventory_quantity > 0);
        console.log(`Available variants: ${JSON.stringify(availableVariants)}`);

        if (availableVariants.length > 0) {
          await sendNotification(subscription.email, {
            subject: 'Product Notification',
            text: `Product ${subscription.sku} is now available on stock.`,
            html: `
              <p>Dear ${subscription.nickname},</p>
              <p>Product ${subscription.sku} is now available on stock.</p>
              <p>Best regards,</p>
              <p>Alex<br> <br>Onkron Technologies<br>
            
            `
          }); 

          // Удаляем подписку после отправки уведомления
          await subscription.destroy();
        }
      } else {
        console.log(`Product with ID ${subscription.inventory_id} not found.`);
      }
    }
  } catch (error) {
    if (error.response) {
      console.error('Error fetching product data:', error.response.data);
    } else {
      console.error('Error fetching product data:', error.message);
    }
  }
}
  

// Планировщик задач для ежедневной проверки

cron.schedule('* * * * *', () => {
  console.log('Running daily product availability check...');
checkProductAvailability();

});

// Функция отправки уведомлений по электронной почте
async function sendNotification(email, notification) {
  const mailOptions = {
    from: 'support@onkron.co.uk',
    to: email,
    subject: notification.subject,
    text: notification.text,
    html: notification.html
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Notification email sent:', info.response);
    }
  });
}

// Слушаем порт
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

});
