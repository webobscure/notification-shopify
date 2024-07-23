const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const sequelize = require('./config/database')
const Subscription = require('./models/Subscription');
const app = express();
const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database & tables created!');
  })
  .catch(err => {
    console.error('Error synchronizing database:', err);
  });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: 'support@onkron.co.uk',
    pass:  'acbr zfpu anlr sibh'
  }
});
 
// middleware for json   
app.use(express.json());
app.use(cors());

app.post('/send-notification', async (req, res) => {
  const { email, sku, nickname, inventory_id } = req.body;
  console.log(req.body); // Логирование данных

  const mailOptions = {
    from: 'support@onkron.co.uk',
    to: email,
    subject: 'Product Notification',
    text: `Simplify Your Life with Our Product Subscription!`,
    html: `
<p>Dear ${nickname},</p>

<p>We are thrilled to introduce our new subscription service for the ${sku}! This service ensures you have uninterrupted access to your favorite products without the need to reorder manually.</p>

<h3>Why Subscribe?</h3>
<ul>
    <li><strong>Convenience:</strong> Enjoy regular deliveries of ${sku} right to your doorstep, perfectly timed to fit your schedule.</li>
    <li><strong>Savings:</strong> Take advantage of exclusive discounts and special offers available only to our subscribers.</li>
    <li><strong>Flexibility:</strong> Adjust your delivery frequency, skip a delivery, or cancel your subscription at any time with ease.</li>
    <li><strong>Priority Service:</strong> Be the first to hear about new products, special events, and limited-time promotions.</li>
</ul>


<p>Thank you for your continued support. We look forward to serving you through our new subscription service.</p>

<p>Best regards,</p>
<p>Alex<br>
Onkron Technologies<br>`
  };

  try {
    const existingSubscription = await Subscription.findOne({ where: { email, sku } });
    if (existingSubscription) {
      return res.status(400).json({ message: 'Subscription already exists for this email' });
    }

    const subscription = new Subscription({ email, sku, nickname, inventory_id });
    await subscription.save();
    console.log('Subscription saved:', subscription); // Логирование сохраненной подписки

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending email' });
      }
      console.log('Email sent:', info.response);
      res.status(200).json({ message: 'Email sent successfully' });
    });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: 'Error saving subscription' });
  }
});

app.get('/check-subscription', async (req, res) => {
  try {
    const [results, metadata] = await sequelize.query("SELECT * FROM notifications");
    res.status(200).json(results);
  } catch (error) {
    console.error('Error checking subscriptions:', error);
    res.status(500).json({ message: 'Error checking subscriptions' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
