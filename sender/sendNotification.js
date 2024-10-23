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
  console.log("Checking products");

  try {
    const subscriptions = await Subscription.findAll();
    
    // Массив промисов для параллельного выполнения запросов
    const requests = subscriptions.map(async (subscription) => {
      console.log(`Checking product availability for subscription: ${JSON.stringify(subscription)}`);

      // Определяем shopifyStore и shopifyAccessToken в зависимости от subscription.country
      const shopifyConfig = getShopifyConfig(subscription.country);
      if (!shopifyConfig) {
        console.log(`No Shopify credentials configured for country: ${subscription.country}`);
        return;
      }

      const { shopifyStore, shopifyAccessToken, companyInfo } = shopifyConfig;

      try {
        const response = await axios.get(`https://${shopifyStore}/admin/api/2023-04/products/${subscription.inventory_id}.json`, {
          headers: { 'X-Shopify-Access-Token': shopifyAccessToken }
        });

        const product = response.data.product;

        if (product) {
          const availableVariants = product.variants.filter(variant => variant.inventory_quantity > 0);
          console.log(`Available variants: ${JSON.stringify(availableVariants)}`);

          if (availableVariants.length > 0) {
            const emailContent = generateEmailContent(subscription, companyInfo);

            await sendNotification(subscription.email, {
              subject: 'Product Notification',
              text: `Product ${subscription.sku} is now available in stock.`,
              html: emailContent
            });

            // Удаляем подписку после отправки уведомления
            await subscription.destroy();
          }
        } else {
          console.log(`Product with ID ${subscription.inventory_id} not found.`);
        }
      } catch (error) {
        console.error(`Error fetching product for subscription ${subscription.inventory_id} from ${subscription.country}:`, error.message);
      }
    });

    // Ожидание выполнения всех запросов
    await Promise.all(requests);
  } catch (error) {
    console.error('Error fetching subscriptions:', error.message);
  }
}

// Функция для получения конфигурации Shopify в зависимости от страны
function getShopifyConfig(country) {
  switch (country) {
    case 'US':
      return {
        shopifyStore: process.env.SHOPIFY_US_STORE,
        shopifyAccessToken: process.env.SHOPIFY_US_ACCESS_TOKEN,
        companyInfo: {
          address: "16801 Addison Road",
          city: "Addison TX",
          postalCode: "Suite 124",
          country: "75001"
        }
      };
    case 'UK':
      return {
        shopifyStore: process.env.SHOPIFY_STORE,
        shopifyAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
        companyInfo: {
          address: "71-75 Shelton Street",
          city: "London",
          postalCode: "WC2H 9JQ",
          country: "United Kingdom"
        }
      };
    // Добавляем остальные страны по аналогии
    case 'DE':
      return {
        shopifyStore: process.env.SHOPIFY_DE_STORE,
        shopifyAccessToken: process.env.SHOPIFY_DE_ACCESS_TOKEN,
        companyInfo: {
          address: "Büro und Lager",
          city: "BMGG EUROPE GMBH",
          postalCode: "Billbrookdeich 36",
          country: "22113 Hamburg"
        }
      };
    case 'PL':
      return {
        shopifyStore: process.env.SHOPIFY_PL_STORE,
        shopifyAccessToken: process.env.SHOPIFY_PL_ACCESS_TOKEN,
        companyInfo: {
          address: "Büro und Lager",
          city: "BMGG EUROPE GMBH",
          postalCode: "Billbrookdeich 36",
          country: "22113 Hamburg"
        }
      };
    case 'FR':
      return {
        shopifyStore: process.env.SHOPIFY_FR_STORE,
        shopifyAccessToken: process.env.SHOPIFY_FR_ACCESS_TOKEN,
        companyInfo: {
          address: "Büro und Lager",
          city: "BMGG EUROPE GMBH",
          postalCode: "Billbrookdeich 36",
          country: "22113 Hamburg"
        }
      };
    case 'IT':
      return {
        shopifyStore: process.env.SHOPIFY_IT_STORE,
        shopifyAccessToken: process.env.SHOPIFY_IT_ACCESS_TOKEN,
        companyInfo: {
          address: "Büro und Lager",
          city: "BMGG EUROPE GMBH",
          postalCode: "Billbrookdeich 36",
          country: "22113 Hamburg"
        }
      };
    case 'ES':
      return {
        shopifyStore: process.env.SHOPIFY_ES_STORE,
        shopifyAccessToken: process.env.SHOPIFY_ES_ACCESS_TOKEN,
        companyInfo: {
          address: "Büro und Lager",
          city: "BMGG EUROPE GMBH",
          postalCode: "Billbrookdeich 36",
          country: "22113 Hamburg"
        }
      };
    default:
      return null;
  }
}

// Функция для генерации контента письма
function generateEmailContent(subscription, companyInfo) {
  return `
    <div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Dear <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Product <strong>${subscription.sku}</strong> is now available in stock.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Thank you for your continued support. We look forward to serving you through our new subscription service.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Best regards, <br>Alex<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">${companyInfo.address}</p>
      <p style="color: #1fcfca; text-align: left;">${companyInfo.city}</p>
      <p style="color: #1fcfca;text-align: left;">${companyInfo.postalCode}</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">${companyInfo.country}</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2024 Onkron ${subscription.country}</p>
    </div>
  `;
}

  

// Планировщик задач для ежедневной проверки
// cron.schedule('0 0 * * * ', () => {
// cron.schedule('*/10 * * * *', () => {

  cron.schedule('0 0 * * * ', () => {
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
