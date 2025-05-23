const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const sequelize = require("./config/database");
const Subscription = require("./models/Subscription");
const app = express();
const PORT = process.env.PORT || 3000;
const { Op, fn, col, literal } = require('sequelize');
const fs = require("fs");
const path = require("path");
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
    user: process.env.USER_AGENT,
    pass: process.env.USER_PASSWORD,
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
          subject: "Product Notification",
          text: "Simplify Your Life with Our Product Subscription!",
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
        <p style="color: #1fcfca; margin-top: 20px;text-align: left;">16801 Addison Road</p>
        <p style="color: #1fcfca; text-align: left;">Addison TX</p>
        <p style="color: #1fcfca;text-align: left;">Suite 124</p>
        <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">75001</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
    
        <!-- Копирайт -->
         
            <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
    </div>`,
        };
      case "UK":
        return {
          shopifyStore: process.env.SHOPIFY_STORE,
          shopifyAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
            subject: "Product Notification",
            text: "Simplify Your Life with Our Product Subscription!",
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
        <p style="color: #1fcfca; margin-top: 20px;text-align: left;">71-75 Shelton Street</p>
        <p style="color: #1fcfca; text-align: left;">London</p>
        <p style="color: #1fcfca;text-align: left;">WC2H 9JQ</p>
        <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">United Kingdom</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
    
        <!-- Копирайт -->
         
            <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
    </div>`,
        };
      // Добавляем остальные страны по аналогии
      case "DE":
        return {
          shopifyStore: process.env.SHOPIFY_DE_STORE,
          shopifyAccessToken: process.env.SHOPIFY_DE_ACCESS_TOKEN,
            subject: "Produktbenachrichtigung",
            text: "Vereinfachen Sie Ihr Leben mit unserem Produktabonnement!",
            html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
        <!-- Логотип -->
        <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
    
        <!-- Приветствие -->
        <p style="margin-top: 20px;">Sehr geehrter <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>!</p>
        
        <!-- Основной текст -->
        <p style="margin-top: 20px;">mit großer Freude präsentieren wir Ihnen unseren neuen Abonnementservice für <strong>${sku}</strong>! Dieser Service gewährleistet, dass Sie ununterbrochen Zugriff auf Ihre bevorzugten Produkte haben, ohne jedes Mal manuell nachbestellen zu müssen.</p>
        
        <!-- Заголовок -->
        <h3 style="color: #1fcfca; margin-top: 30px;">Warum ein Abonnement abschließen?</h3>
        
        <!-- Список преимуществ -->
        <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
            <li ><strong><p>Bequemlichkeit:</p></strong> Erhalten Sie den  ${sku} in regelmäßigen Abständen direkt bis an Ihre Haustür, genau abgestimmt auf Ihren persönlichen Zeitplan.</li>
            <li ><strong><p>Einsparungen:</p></strong> Profitieren Sie von exklusiven Rabatten und Sonderangeboten, die ausschließlich für unsere Abonnenten verfügbar sind.</li>
            <li ><strong><p>Flexibilität:</p></strong> Passen Sie die Lieferfrequenz individuell an, setzen Sie eine Lieferung aus oder beenden Sie Ihr Abonnement ganz unkompliziert.</li>
            <li ><strong><p>Prioritätsservice:</p></strong> Erhalten Sie frühzeitig Informationen über neue Produkte, besondere Events und zeitlich begrenzte Aktionen.</li>
        </ul>
    
        <!-- Благодарность -->
        <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Wir danken Ihnen herzlich für Ihre beständige Unterstützung und freuen uns darauf, Sie mit unserem neuen Abonnementservice noch besser zu betreuen.</p>
    
        <!-- Заключение -->
        <p style="margin-top: 20px;text-align: left;">Mit freundlichen Grüßen, Alex<br>Onkron Technologies</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
    
        <!-- Адрес -->
        <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lager</p>
        <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
        <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
        <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
    
        <!-- Копирайт -->
         
            <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
    </div>`,
        };
      case "PL":
        return {
          shopifyStore: process.env.SHOPIFY_PL_STORE,
          shopifyAccessToken: process.env.SHOPIFY_PL_ACCESS_TOKEN,
            subject: "Powiadomienie o produkcie",
            text: "Uprość swoje życie dzięki naszej subskrypcji produktów!",
            html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
        <!-- Логотип -->
        <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
    
        <!-- Приветствие -->
        <p style="margin-top: 20px;">Drogi <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>!</p>
        
        <!-- Основной текст -->
        <p style="margin-top: 20px;">Z przyjemnością prezentujemy nasz nowy serwis subskrypcyjny dla produktu <strong>${sku}</strong>! Dzięki temu serwisowi zyskujesz nieprzerwany dostęp do swoich ulubionych produktów bez konieczności każdorazowego składania zamówienia.</p>
        
        <!-- Заголовок -->
        <h3 style="color: #1fcfca; margin-top: 30px;">Dlaczego warto wybrać subskrypcję? </h3>
        
        <!-- Список преимуществ -->
        <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
            <li ><strong><p>Wygoda:</p></strong> Regularne dostawy  ${sku} bezpośrednio pod twoje drzwi, idealnie dopasowane do twojego planu dnia.</li>
            <li ><strong><p>Oszczędności:</p></strong> Skorzystaj z wyjątkowych rabatów i specjalnych ofert przeznaczonych wyłącznie dla subskrybentów.</li>
            <li ><strong><p>Elastyczność:</p></strong> Możliwość dostosowania częstotliwości dostaw, pominięcia wybranej dostawy czy rezygnacji z subskrypcji w każdej chwili, bez zbędnych komplikacji.</li>
            <li ><strong><p>Priorytetowa obsługa:</p></strong> Uzyskuj informacje o nowych produktach, specjalnych wydarzeniach i ograniczonych czasowo promocjach jako pierwszy.</li>
        </ul>
    
        <!-- Благодарность -->
        <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Dziękujemy za twoje stałe wsparcie. Z niecierpliwością czekamy na możliwość świadczenia usług w ramach naszego nowego serwisu subskrypcyjnego.</p>
    
        <!-- Заключение -->
        <p style="margin-top: 20px;text-align: left;">Z wyrazami szacunku, Alex<br>Onkron Technologies</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
    
        <!-- Адрес -->
        <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lager</p>
        <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
        <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
        <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
    
        <!-- Копирайт -->
         
            <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
    </div>`,
        };
      case "FR":
        return {
          shopifyStore: process.env.SHOPIFY_FR_STORE,
          shopifyAccessToken: process.env.SHOPIFY_FR_ACCESS_TOKEN,
            subject: "Notification de produit",
            text: "Simplifiez-vous la vie avec notre abonnement aux produits!",
            html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
        <!-- Логотип -->
        <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
    
        <!-- Приветствие -->
        <p style="margin-top: 20px;">Cher <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>!</p>
        
        <!-- Основной текст -->
        <p style="margin-top: 20px;">Nous avons le plaisir de vous annoncer notre nouveau service d’abonnement pour le <strong>${sku}</strong>! Grâce à ce service, bénéficiez d’un accès ininterrompu à vos produits préférés, sans avoir à renouveler vos commandes manuellement.</p>
        
        <!-- Заголовок -->
        <h3 style="color: #1fcfca; margin-top: 30px;">Pourquoi choisir l'abonnement?</h3>
        
        <!-- Список преимуществ -->
        <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
            <li ><strong><p>Commodité:</p></strong> Profitez de livraisons régulières de ${sku} directement à votre porte, parfaitement synchronisées avec votre emploi du temps.</li>
            <li ><strong><p>Économies:</p></strong> Bénéficiez de réductions exclusives et d’offres spéciales réservées exclusivement à nos abonnés.</li>
            <li ><strong><p>Souplesse:</p></strong> Ajustez votre fréquence de livraison, sautez une livraison ou annulez votre abonnement à tout moment.</li>
            <li ><strong><p>Service prioritaire:</p></strong> Soyez le premier informé des nouveaux produits, des événements spéciaux et des promotions à durée limitée.</li>
        </ul>
    
        <!-- Благодарность -->
        <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Nous vous remercions sincèrement pour votre fidélité et sommes hâte de vous servir grâce à notre nouveau service d’abonnement.</p>
    
        <!-- Заключение -->
        <p style="margin-top: 20px;text-align: left;">Meilleures salutations, Alex<br>Onkron Technologies</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
    
        <!-- Адрес -->
        <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lager</p>
        <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
        <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
        <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
    
        <!-- Копирайт -->
         
            <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
    </div>`,
        };
      case "IT":
        return {
          shopifyStore: process.env.SHOPIFY_IT_STORE,
          shopifyAccessToken: process.env.SHOPIFY_IT_ACCESS_TOKEN,
            subject: "Notifica del prodotto",
            text: "Semplificate la vostra vita con il nostro abbonamento ai prodotti!",
            html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
        <!-- Логотип -->
        <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
    
        <!-- Приветствие -->
        <p style="margin-top: 20px;">Caro  <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>!</p>
        
        <!-- Основной текст -->
        <p style="margin-top: 20px;">Siamo lieti di annunciare il lancio del nostro nuovo servizio di abbonamento per il <strong>${sku}</strong>! Con questa nuova formula, avrà sempre accesso ai suoi prodotti preferiti senza dover effettuare ordini manuali.</p>
        
        <!-- Заголовок -->
        <h3 style="color: #1fcfca; margin-top: 30px;">Perché scegliere l’abbonamento?</h3>
        
        <!-- Список преимуществ -->
        <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
            <li ><strong><p>Praticità:</p></strong> Riceva il ${sku} con consegne periodiche direttamente a casa sua, pianificate per adattarsi perfettamente alle sue esigenze.</li>
            <li ><strong><p>Vantaggi economici:</p></strong> Approfitti di sconti esclusivi e offerte riservate solo agli abbonati.</li>
            <li ><strong><p>Massima flessibilità:</p></strong> Modifichi la frequenza delle consegne, salti una spedizione o annulli l’abbonamento quando vuole, senza complicazioni.</li>
            <li ><strong><p>Servizio prioritario:</p></strong> Rimanga sempre aggiornato su nuovi prodotti, eventi speciali e promozioni a tempo limitato.</li>
        </ul>
    
        <!-- Благодарность -->
        <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Si ringraziamo per la sua fedeltà e siamo entusiasti di potersi servire con il nostro nuovo servizio di abbonamento.</p>
    
        <!-- Заключение -->
        <p style="margin-top: 20px;text-align: left;">Cordiali saluti, Alex<br>Onkron Technologies</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
    
        <!-- Адрес -->
        <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lager</p>
        <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
        <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
        <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
    
        <!-- Копирайт -->
         
            <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
    </div>`,
        };
      case "ES":
        return {
          shopifyStore: process.env.SHOPIFY_ES_STORE,
          shopifyAccessToken: process.env.SHOPIFY_ES_ACCESS_TOKEN,
            subject: "Notificación del producto",
            text: "¡Simplifique su vida con nuestra suscripción de productos!",
            html: `<div style="font-family: Gilroy, Arial, sans-serif; text-align: center; width: 100%; max-width: 600px; margin: 0 auto;">
        <!-- Логотип -->
        <img src="https://cdn.shopify.com/s/files/1/0558/2277/8562/files/logo.png?v=1622659938" alt="onkron" width="300" style="display: block; margin: 0 auto;"/>
    
        <!-- Приветствие -->
        <p style="margin-top: 20px;">Estimado <span style="color: #1fcfca;font-weight: 600;">${nickname}</span>!</p>
        
        <!-- Основной текст -->
        <p style="margin-top: 20px;">Nos complace anunciar el lanzamiento de nuestro nuevo servicio de suscripción para el <strong>${sku}</strong>! Con este servicio, tendrá acceso continuo a sus productos favoritos sin necesidad de gestionar pedidos manualmente.</p>
        
        <!-- Заголовок -->
        <h3 style="color: #1fcfca; margin-top: 30px;">¿Por qué optar por la suscripción?</h3>
        
        <!-- Список преимуществ -->
        <ul style="list-style: none; padding: 0; margin: 20px auto; text-align: left;">
            <li ><strong><p>Comodidad:</p></strong> Recibe el  ${sku} de manera periódica y directamente en tu domicilio, con un calendario adaptado a tu rutina.</li>
            <li ><strong><p>Ahorros:</p></strong> Disfrute de descuentos exclusivos y promociones especiales disponibles únicamente para nuestros suscriptores.</li>
            <li ><strong><p>Flexibilidad:</p></strong> Modifique la frecuencia de las entregas, salte un envío o cancele tu suscripción cuando lo desea, de forma sencilla.</li>
            <li ><strong><p>Servicio preferente:</p></strong> Descubra al tanto de nuevos lanzamientos, eventos especiales y ofertas por tiempo limitado antes que nadie.</li>
        </ul>
    
        <!-- Благодарность -->
        <p style="color: #1fcfca; margin-top: 30px;font-weight: 500;">Agradecemos su lealtad y esperamos poder servirse con nuestro nuevo servicio de suscripción.</p>
    
        <!-- Заключение -->
        <p style="margin-top: 20px;text-align: left;">Atentamente, Alex<br>Onkron Technologies</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 15px; border: none; width: 100%; max-width: 600px; margin: 30px auto;">
    
        <!-- Адрес -->
        <p style="color: #1fcfca; margin-top: 20px;text-align: left;">Büro und Lager</p>
        <p style="color: #1fcfca; text-align: left;">BMGG EUROPE GMBH</p>
        <p style="color: #1fcfca;text-align: left;">Billbrookdeich 36</p>
        <p style="color: #1fcfca; margin-bottom: 20px;text-align: left;">22113 Hamburg</p>
    
        <!-- Горизонтальная линия -->
        <hr style="background-color: #1fcfca; height: 1px; border: none; width: 100%; max-width: 600px; margin: 20px auto;">
    
        <!-- Копирайт -->
         
            <p style="margin-top: 20px;text-align:right;">© 2025 Onkron ${country}</p>
    </div>`,
        };
      default:
        return null;
    }
  }

  const shopifyConfig = getShopifyConfig(country);

  const { subject, text, html } = shopifyConfig;

  const mailOptions = {
    from: process.env.USER_AGENT,
    to: email,
    subject: subject,
    text: text,
    html: html,
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
    const [results] = await sequelize.query(
      "SELECT * FROM notifications"
    );
    res.status(200).json(results);
  } catch (error) {
    console.error("Error checking subscriptions:", error);
    res.status(500).json({ message: "Error checking subscriptions" });
  }
});

app.get("/subscription-stats", async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      attributes: [
        'country',
        'sku',
        [fn('COUNT', col('sku')), 'total_count']
      ],
      group: ['country', 'sku'],
      order: [[literal('total_count'), 'DESC']],
      raw: true,
    });

    const totalSubscriptions = await Subscription.count();

    // Группируем по стране
    const statsByCountry = {};
    for (const item of subscriptions) {
      const country = item.country || 'Unknown';
      if (!statsByCountry[country]) statsByCountry[country] = [];
      statsByCountry[country].push(item);
    }

    // Формируем текст
    const columnCount = 4;
    let lines = [`📦 Общее количество подписок: ${totalSubscriptions}\n`];

    for (const [country, entries] of Object.entries(statsByCountry)) {
      lines.push(`\n🌍 ${country}`);

      const rows = Math.ceil(entries.length / columnCount);
      for (let row = 0; row < rows; row++) {
        let line = '';
        for (let col = 0; col < columnCount; col++) {
          const index = row + col * rows;
          if (index < entries.length) {
            const entry = `${entries[index].sku}: ${entries[index].total_count}`.padEnd(25);
            line += entry;
          }
        }
        lines.push(line.trimEnd());
      }
    }

    const formattedText = lines.join('\n');

    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(formattedText);

  } catch (error) {
    console.error("Error getting subscription statistics:", error);
    res.status(500).send("Ошибка при получении статистики подписок");
  }
});




app.get("/all-subs", async (req, res) => {
try {
    const [results] = await sequelize.query("SELECT sku, country FROM notifications");

    if (!results.length) {
      return res.status(200).send("Нет подписок.");
    }

    // Группировка по странам
    const countryMap = {};
    for (const { sku, country } of results) {
      if (!countryMap[country]) countryMap[country] = [];
      countryMap[country].push(sku);
    }

    // Формирование CSV
    const csvLines = ["SKU;Country", ...results.map(({ sku, country }) => `${sku};${country}`)];
    const csvContent = csvLines.join("\n");
    const filePath = path.join(__dirname, "subscription_stats.csv");
    fs.writeFileSync(filePath, csvContent, "utf-8");

    // Генерация HTML с таблицами по странам
    const countryTables = Object.entries(countryMap).map(([country, skus]) => {
      const rows = [];
      for (let i = 0; i < skus.length; i += 4) {
        const row = skus.slice(i, i + 4).map(sku => `<td>${sku} - ${country}</td>`).join("");
        rows.push(`<tr>${row}</tr>`);
      }

      return `
        <h3>${country}</h3>
        <table>
          ${rows.join("\n")}
        </table>
      `;
    });

    const downloadUrl = "/download-subscription-csv";

    // HTML-шаблон
    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Подписки</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            h3 {
              margin-top: 30px;
              color: #333;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            td {
              border: 1px solid #ccc;
              padding: 6px 10px;
              vertical-align: top;
            }
            button {
              font-size: 16px;
              padding: 10px 16px;
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            }
            button:hover {
              background-color: #45a049;
            }
          </style>
        </head>
        <body>
          <h2>Статистика подписок по странам:</h2>
          ${countryTables.join("\n")}
          <a href="${downloadUrl}" download="subscription_stats.csv">
            <button>Скачать CSV</button>
          </a>
        </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error("Error generating subscription data:", error);
    res.status(500).send("Ошибка при проверке подписок.");
  }
});

// Отдельный эндпоинт для скачивания CSV
app.get("/download-subscription-csv", (req, res) => {
  const filePath = path.join(__dirname, "subscription_stats.csv");
  res.download(filePath, "subscription_stats.csv", (err) => {
    if (err) {
      console.error("Ошибка при скачивании CSV:", err);
      res.status(500).send("Ошибка при скачивании файла.");
    }

    // Удаляем после отправки
    fs.unlink(filePath, (err) => {
      if (err) console.error("Ошибка удаления временного файла:", err);
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
