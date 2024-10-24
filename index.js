const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const sequelize = require("./config/database");
const Subscription = require("./models/Subscription");
const app = express();
const PORT = process.env.PORT || 3000;

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Database & tables created!");
  })
  .catch((err) => {
    console.error("Error synchronizing database:", err);
  });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "support@onkron.co.uk",
    pass: "acbr zfpu anlr sibh",
  },
});

// middleware for json
app.use(express.json());
app.use(cors());

app.post("/send-notification", async (req, res) => {
  const { email, sku, nickname, inventory_id, country } = req.body;
  console.log(req.body); // Логирование данных

  // Функция для получения конфигурации Shopify в зависимости от страны
  function getShopifyConfig(country) {
    switch (country) {
      case "US":
        return {
          shopifyStore: process.env.SHOPIFY_US_STORE,
          shopifyAccessToken: process.env.SHOPIFY_US_ACCESS_TOKEN,
          companyInfo: {
            address: "16801 Addison Road",
            city: "Addison TX",
            postalCode: "Suite 124",
            country: "75001",
          },
        };
      case "UK":
        return {
          shopifyStore: process.env.SHOPIFY_STORE,
          shopifyAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
          companyInfo: {
            address: "71-75 Shelton Street",
            city: "London",
            postalCode: "WC2H 9JQ",
            country: "United Kingdom",
          },
        };
      // Добавляем остальные страны по аналогии
      case "DE":
        return {
          shopifyStore: process.env.SHOPIFY_DE_STORE,
          shopifyAccessToken: process.env.SHOPIFY_DE_ACCESS_TOKEN,
          companyInfo: {
            address: "Büro und Lager",
            city: "BMGG EUROPE GMBH",
            postalCode: "Billbrookdeich 36",
            country: "22113 Hamburg",
          },
        };
      case "PL":
        return {
          shopifyStore: process.env.SHOPIFY_PL_STORE,
          shopifyAccessToken: process.env.SHOPIFY_PL_ACCESS_TOKEN,
          companyInfo: {
            address: "Büro und Lager",
            city: "BMGG EUROPE GMBH",
            postalCode: "Billbrookdeich 36",
            country: "22113 Hamburg",
          },
        };
      case "FR":
        return {
          shopifyStore: process.env.SHOPIFY_FR_STORE,
          shopifyAccessToken: process.env.SHOPIFY_FR_ACCESS_TOKEN,
          companyInfo: {
            address: "Büro und Lager",
            city: "BMGG EUROPE GMBH",
            postalCode: "Billbrookdeich 36",
            country: "22113 Hamburg",
          },
        };
      case "IT":
        return {
          shopifyStore: process.env.SHOPIFY_IT_STORE,
          shopifyAccessToken: process.env.SHOPIFY_IT_ACCESS_TOKEN,
          companyInfo: {
            address: "Büro und Lager",
            city: "BMGG EUROPE GMBH",
            postalCode: "Billbrookdeich 36",
            country: "22113 Hamburg",
          },
        };
      case "ES":
        return {
          shopifyStore: process.env.SHOPIFY_ES_STORE,
          shopifyAccessToken: process.env.SHOPIFY_ES_ACCESS_TOKEN,
          companyInfo: {
            address: "Büro und Lager",
            city: "BMGG EUROPE GMBH",
            postalCode: "Billbrookdeich 36",
            country: "22113 Hamburg",
          },
        };
      default:
        return null;
    }
  }

  const shopifyConfig = getShopifyConfig(country);

  const { companyInfo } = shopifyConfig;

  const mailOptions = {
    from: "support@onkron.co.uk",
    to: email,
    subject: "Product Notification",
    text: `Simplify Your Life with Our Product Subscription!`,
    html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
        <!-- Логотип -->
        <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
    
        <!-- Приветствие -->
        <p style="margin-top: 20px;">Dear <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>!</p>
        
        <!-- Основной текст -->
        <p style="margin-top: 20px;">We are thrilled to introduce our new subscription service for the <strong>${sku}</strong>! This service ensures you have uninterrupted access to your favorite products without the need to reorder manually.</p>
        
        <!-- Заголовок -->
        <h3 style="color: #1fcfca; margin-top: 30px;">Why Subscribe?</h3>
        
        <!-- Список преимуществ -->
        <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
            <li ><strong><p>Convenience:</p></strong> Enjoy regular deliveries of ${sku} right to your doorstep, perfectly timed to fit your schedule.</li>
            <li ><strong><p>Savings:</p></strong> Take advantage of exclusive discounts and special offers available only to our subscribers.</li>
            <li ><strong><p>Flexibility:</p></strong> Adjust your delivery frequency, skip a delivery, or cancel your subscription at any time with ease.</li>
            <li ><strong><p>Priority Service:</p></strong> Be the first to hear about new products, special events, and limited-time promotions.</li>
        </ul>
    
        <!-- Благодарность -->
        <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Thank you for your continued support. We look forward to serving you through our new subscription service.</p>
    
        <!-- Заключение -->
        <p style="margin-top: 20px;text-align: left;">Best regards, Alex<br>Onkron Technologies</p>
    
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
         
            <p style="margin-top: 20px;text-align:right;">© 2024 Onkron ${country}</p>
    </div>`,
  };

  try {
    const existingSubscription = await Subscription.findOne({
      where: { email, sku },
    });
    if (existingSubscription) {
      return res
        .status(400)
        .json({ message: "Subscription already exists for this email" });
    }

    const subscription = new Subscription({
      email,
      sku,
      nickname,
      inventory_id,
      country,
    });
    await subscription.save();
    console.log("Subscription saved:", subscription); // Логирование сохраненной подписки

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ message: "Error sending email" });
      }
      console.log("Email sent:", info.response);
      res.status(200).json({ message: "Email sent successfully" });
    });
  } catch (error) {
    console.error("Error saving subscription:", error);
    res.status(500).json({ message: "Error saving subscription" });
  }
});

app.get("/check-subscription", async (req, res) => {
  try {
    const [results, metadata] = await sequelize.query(
      "SELECT * FROM notifications"
    );
    res.status(200).json(results);
  } catch (error) {
    console.error("Error checking subscriptions:", error);
    res.status(500).json({ message: "Error checking subscriptions" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
