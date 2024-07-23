const axios = require('axios');
require('dotenv').config();

const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
const shopifyStore = process.env.SHOPIFY_STORE;

async function getWebhooks() {
  try {
    const response = await axios.get(`https://${shopifyStore}/admin/api/2023-04/webhooks.json`, {
      headers: {
        'X-Shopify-Access-Token': shopifyAccessToken
      }
    });
   
    const webhooks = response.data.webhooks;

    if (webhooks.length > 0) {
      console.log('Webhooks:');
      webhooks.forEach(webhook => {
        console.log(`- ID: ${webhook.id}, Topic: ${webhook.topic}, Address: ${webhook.address}`);
      });
    } else {
      console.log('No webhooks found.');
    }
  } catch (error) {
    if (error.response) {
      console.error('Error fetching webhooks:', error.response.data);
    } else {
      console.error('Error fetching webhooks:', error.message);
    }
  }
}

getWebhooks();
