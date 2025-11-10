const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { google } = require('googleapis');
const cron = require("node-cron");
const sequelize = require("../config/database");
const Subscription = require("../models/Subscription");

const app = express();
const PORT = process.env.PORT_CHECKER || 5000;

// Создаем OAuth2 клиент для Gmail API
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Устанавливаем credentials
oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

// Функция для отправки email через Gmail API
async function sendEmailDirect(email, { subject, text, html }) {
  try {
    console.log(`📧 Attempting to send email to: ${email}`);

    // Получаем актуальный access token
    const { token } = await oAuth2Client.getAccessToken();
    if (!token) {
      throw new Error("Failed to get access token");
    }

    // Создаем Gmail клиент
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // Формируем email в формате RFC 5322
    const message = [
      'Content-Type: text/html; charset="UTF-8"\r\n',
      'MIME-Version: 1.0\r\n',
      'Content-Transfer-Encoding: 7bit\r\n',
      `From: "Onkron Notifications" <${process.env.GMAIL_EMAIL}>\r\n`,
      `Reply-To: ${process.env.GMAIL_EMAIL}\r\n`,
      `To: ${email}\r\n`,
      `Subject: ${subject}\r\n`,
      'Message-ID: <' + Date.now() + Math.random().toString(36).substr(2, 9) + '@onkron.com>\r\n',
      'Date: ' + new Date().toUTCString() + '\r\n',
      'X-Priority: 1\r\n',
      'X-Mailer: Onkron Notification System v1.0\r\n',
      '\r\n',
      html
    ].join('');

    // Кодируем сообщение в base64
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Отправляем через Gmail API
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log(`✅ Email sent successfully to ${email}`);
    console.log(`📫 Message ID: ${response.data.id}`);
    
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to send email to ${email}:`, error.message);
    
    // Если ошибка аутентификации, пробуем обновить токен
    if (error.code === 401 || error.message.includes('authentication')) {
      console.log("🔄 Refreshing access token...");
      try {
        const { credentials } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(credentials);
        console.log("✅ Access token refreshed");
        // Повторяем отправку
        return await sendEmailDirect(email, { subject, text, html });
      } catch (refreshError) {
        console.error("❌ Failed to refresh access token:", refreshError);
        // Отправляем уведомление об ошибке
        await sendErrorNotification("Gmail authentication failed", refreshError);
      }
    }
    
    throw error;
  }
}

// Функция для отправки уведомлений об ошибках
async function sendErrorNotification(subject, error) {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    if (!token) return;

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const errorMessage = [
      'Content-Type: text/html; charset="UTF-8"\r\n',
      'MIME-Version: 1.0\r\n',
      'Content-Transfer-Encoding: 7bit\r\n',
      `From: "Onkron System" <${process.env.GMAIL_EMAIL}>\r\n`,
      `To: sparkygino@gmail.com\r\n`,
      `Subject: ${subject}\r\n`,
      '\r\n',
      `<h3>System Error Notification</h3>`,
      `<p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
      `<p><strong>Error:</strong> ${error.message}</p>`,
      `<pre>${error.stack}</pre>`
    ].join('');

    const encodedMessage = Buffer.from(errorMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
    
    console.log("✅ Error notification sent");
  } catch (notificationError) {
    console.error("❌ Failed to send error notification:", notificationError);
  }
}

// Middleware для обработки JSON
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, headers, retries = 3, delayMs = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, { headers });
      return response;
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers["retry-after"];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delayMs;
        console.warn(`Rate limit exceeded. Retrying in ${waitTime}ms...`);

        if (i < retries - 1) {
          await delay(waitTime);
        } else {
          throw new Error(`Failed after ${retries} attempts due to rate limit`);
        }
      } else {
        throw error;
      }
    }
  }
}

async function checkProductAvailability() {
  try {
    const subscriptions = await Subscription.findAll();

    for (const subscription of subscriptions) {
      console.log(
        `Checking product availability for subscription: ${JSON.stringify(
          subscription
        )}`
      );

      const shopifyConfig = getShopifyConfig(
        subscription.country,
        subscription
      );
      if (!shopifyConfig) {
        console.log(
          `No Shopify credentials configured for country: ${subscription.country}`
        );
        continue;
      }

      const { shopifyStore, shopifyAccessToken, subject, text, html } =
        shopifyConfig;

      try {
        const response = await fetchWithRetry(
          `https://${shopifyStore}/admin/api/2025-10/products/${subscription.inventory_id}.json`,
          { "X-Shopify-Access-Token": shopifyAccessToken }
        );

        const product = response.data.product;
        if (product) {
          const availableVariants = product.variants.filter(
            (variant) => variant.inventory_quantity > 0
          );
          console.log(
            `Available variants: ${JSON.stringify(availableVariants)}`
          );

          if (availableVariants.length > 0) {
            await sendNotification(subscription.email, { subject, text, html });
            await subscription.destroy();
          }
        } else {
          console.log(
            `Product with ID ${subscription.inventory_id} not found.`
          );
        }
      } catch (error) {
        console.error(
          `Error fetching product from ${subscription.country} for subscription ${subscription.inventory_id}:`,
          error.message
        );
        await sendErrorNotification(
          `Error fetching product ${subscription.sku} from ${subscription.country}`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Error fetching subscriptions:", error.message);
    await sendErrorNotification("Error in checkProductAvailability", error);
  }
}

// Функция для получения конфигурации Shopify в зависимости от страны
function getShopifyConfig(country, subscription) {
  switch (country) {
    case "US":
      return {
        shopifyStore: process.env.SHOPIFY_US_STORE,
        shopifyAccessToken: process.env.SHOPIFY_US_ACCESS_TOKEN,
        subject: "Product Notification",
        text: `Product ${subscription.sku} is now available in stock.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Dear <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Product <strong>${subscription.sku}</strong> is now available in stock.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Thank you for your continued support. We look forward to serving you through our new subscription service.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Best regards<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">16801 Addison Road</p>
      <p style="color: #1fcfca; text-align: left;">Addison TX</p>
      <p style="color: #1fcfca;text-align: left;">Suite 124</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">75001</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    case "UK":
      return {
        shopifyStore: process.env.SHOPIFY_STORE,
        shopifyAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
        subject: "Product Notification",
        text: `Product ${subscription.sku} is now available in stock.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Dear <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Product <strong>${subscription.sku}</strong> is now available in stock.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Thank you for your continued support. We look forward to serving you through our new subscription service.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Best regards<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">71-75 Shelton Street</p>
      <p style="color: #1fcfca; text-align: left;">London</p>
      <p style="color: #1fcfca;text-align: left;">WC2H 9JQ</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">United Kingdom</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    // Добавляем остальные страны по аналогии
    case "DE":
      return {
        shopifyStore: process.env.SHOPIFY_DE_STORE,
        shopifyAccessToken: process.env.SHOPIFY_DE_ACCESS_TOKEN,
        subject: "Produktbenachrichtigung",
        text: `Das Produkt ${subscription.sku} ist jetzt auf Lager verfügbar.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Sehr geehrter <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Das Produkt  <strong>${subscription.sku}</strong> ist ab sofort auf Lager verfügbar.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;"> Wir danken Ihnen herzlich für Ihre anhaltende Unterstützung und freuen uns darauf, Sie mit unserem neuen Abonnementservice betreuen zu dürfen.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Mit besten Grüßen<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lage</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    case "PL":
      return {
        shopifyStore: process.env.SHOPIFY_PL_STORE,
        shopifyAccessToken: process.env.SHOPIFY_PL_ACCESS_TOKEN,
        subject: "Powiadomienie o produkcie",
        text: `Produkt ${subscription.sku} jest już dostępny w magazynie.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Szanowny <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Z przyjemnością informujemy, że produkt <strong>${subscription.sku}</strong> jest już dostępny w naszym magazynie.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;"> Serdecznie dziękujemy za Twoje stałe wsparcie i z niecierpliwością czekamy na możliwość obsługi w ramach naszej nowej usługi subskrypcyjnej.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Z wyrazami szacunku<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lage</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    case "FR":
      return {
        shopifyStore: process.env.SHOPIFY_FR_STORE,
        shopifyAccessToken: process.env.SHOPIFY_FR_ACCESS_TOKEN,
        subject: "Notification de produit",
        text: `Le produit ${subscription.sku} est maintenant disponible en stock.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Cher <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Nous avons le plaisir de vous informer que le produit <strong>${subscription.sku}</strong> disponible en stock.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;"> Nous vous remercions sincèrement pour votre fidélité et sommes hâte de vous servir grâce à notre nouveau service d’abonnement.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Cordialement<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lage</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    case "IT":
      return {
        shopifyStore: process.env.SHOPIFY_IT_STORE,
        shopifyAccessToken: process.env.SHOPIFY_IT_ACCESS_TOKEN,
        subject: "Notifica del prodotto",
        text: `Il prodotto ${subscription.sku} è ora disponibile in magazzino.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Caro <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Siamo lieti di informarvi che il prodotto <strong>${subscription.sku}</strong> è ora disponibile in magazzino.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Vi ringraziamo per il costante sostegno e siamo entusiasti di potervi assistere con il nostro nuovo servizio in abbonamento.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Distinti saluti<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lage</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    case "ES":
      return {
        shopifyStore: process.env.SHOPIFY_ES_STORE,
        shopifyAccessToken: process.env.SHOPIFY_ES_ACCESS_TOKEN,
        subject: "Notificación del producto",
        text: `El producto ${subscription.sku} ya está disponible.`,
        html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
      <!-- Логотип -->
      <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="Onkron" width="300" style="display: block; margin: 0 auto;" />
      <!-- Приветствие -->
      <p style="margin-top: 20px;">Estimado <span style="color: #1fcfca;font-weight: 600;">${subscription.nickname}</span>!</p>
      <!-- Основной текст -->
      <p style="margin-top: 20px;">Nos complace informarle que el producto <strong>${subscription.sku}</strong> ya se encuentra disponible en stock.</p>
      <!-- Заголовок -->
      <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;"> . Agradecemos sinceramente su constante apoyo y esperamos atenderle mediante nuestro nuevo servicio de suscripción.</p>
      <!-- Заключение -->
      <p style="margin-top: 20px;text-align: left;">Cordialmente<br>Onkron Technologies</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
      <!-- Адрес -->
      <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lage</p>
      <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
      <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
      <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
      <!-- Горизонтальная линия -->
      <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
      <!-- Копирайт -->
      <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${subscription.country}</p>
    </div>`,
      };
    default:
      return null;
  }
}

// Планировщик задач для ежедневной проверки
cron.schedule("0 0 * * *", () => {
  console.log("Running daily product availability check...");
  checkProductAvailability();
});

// Функция отправки уведомлений по электронной почте
async function sendNotification(email, notification) {
  try {
    await sendEmailDirect(email, {
      subject: notification.subject,
      text: notification.text,
      html: notification.html
    });
    console.log(`✅ Notification sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send notification to ${email}:`, error.message);
    // Отправляем уведомление об ошибке
    await sendErrorNotification(`Failed to send notification to ${email}`, error);
  }
}

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    if (token) {
      res.json({ 
        status: "healthy", 
        gmail: "connected",
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        status: "unhealthy", 
        gmail: "disconnected",
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ 
      status: "unhealthy", 
      gmail: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Тестирование соединения при старте
async function testGmailConnection() {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    if (token) {
      console.log("✅ Gmail API connection successful");
      return true;
    } else {
      throw new Error("No access token");
    }
  } catch (error) {
    console.error("❌ Gmail API connection failed:", error);
    return false;
  }
}

// Запускаем тест при старте сервера
testGmailConnection();

// Слушаем порт
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

