const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const sequelize = require('../config/database');
const Subscription = require('../models/Subscription');

const app = express();
const PORT = process.env.PORT_CHECKER || 5000;


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

      // // Определяем shopifyStore и shopifyAccessToken в зависимости от subscription.country
      let shopifyStore, shopifyAccessToken;

      switch (subscription.country) {
        case 'US':
          shopifyStore = process.env.SHOPIFY_US_STORE;
          shopifyAccessToken = process.env.SHOPIFY_US_ACCESS_TOKEN;
          break;
        case 'UK':
          shopifyStore = process.env.SHOPIFY_STORE;
          shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
          break;
        case 'DE':
          shopifyStore = process.env.SHOPIFY_DE_STORE;
          shopifyAccessToken = process.env.SHOPIFY_DE_ACCESS_TOKEN;
          break;
        case 'PL':
          shopifyStore = process.env.SHOPIFY_PL_STORE;
          shopifyAccessToken = process.env.SHOPIFY_PL_ACCESS_TOKEN;
          break;
        case 'FR':
          shopifyStore = process.env.SHOPIFY_FR_STORE;
          shopifyAccessToken = process.env.SHOPIFY_FR_ACCESS_TOKEN;
          break;
        case 'IT':
          shopifyStore = process.env.SHOPIFY_IT_STORE;
          shopifyAccessToken = process.env.SHOPIFY_IT_ACCESS_TOKEN;
          break;
        case 'ES':
          shopifyStore = process.env.SHOPIFY_ES_STORE;
          shopifyAccessToken = process.env.SHOPIFY_ES_ACCESS_TOKEN;
          break;
        default:
          console.log(`No Shopify credentials configured for country: ${subscription.country}`);
          continue; // Переходим к следующей подписке, если страна не определена
      }
      console.log(`Checking sbusctiption from ${subscription.country}`)
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
              <div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
        <!-- Логотип -->
        <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
    
        <!-- Приветствие -->
        <p style="margin-top: 20px;">Dear <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
        
        <!-- Основной текст -->
        <p style="margin-top: 20px;">
            Product <strong>${subscription.sku}</strong> is now available on stock.
        
        <!-- Заголовок -->
        
    
        <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Thank you for your continued support. We look forward to serving you through our new subscription service.</p>
    
        <!-- Заключение -->
        <p style="margin-top: 20px;text-align: left;">Best regards, <br>Alex<br>Onkron Technologies</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
    
        <!-- Адрес -->
        <h4 style="color: #1fcfca; margin-top: 20px;text-align: left;">Onkron UK</h4>
        <p style="color: #1fcfca; margin-top: 20px;text-align: left;">71-75 Shelton Street</p>
        <p style="color: #1fcfca; text-align: left;">London, England</p>
        <p style="color: #1fcfca;text-align: left;">WC2H 9JQ</p>
        <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">United Kingdom</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
    
        <!-- Копирайт -->
         
            <p style="margin-top: 20px;text-align:right;">© 2024 Onkron UK</p>
    </div>
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
// 0 0 * * * 
cron.schedule('*/10 * * * *', () => {
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
