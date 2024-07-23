const axios = require('axios');
const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
const shopifyStore = process.env.SHOPIFY_STORE;

// Создание вебхука
axios.post(`https://${shopifyStore}/admin/api/2023-04/webhooks.json`, {
  webhook: {
    topic: 'inventory_levels/update',
    address: 'https://9cbc-92-118-112-65.ngrok-free.app.webhooks/shopify',
    format: 'json'
  }
}, {
  headers: {
    'X-Shopify-Access-Token': shopifyAccessToken,
    'Content-Type': 'application/json'
  }
}).then(response => {
  console.log('Webhook created:', response.data);
}).catch(error => {
  if (error.response) {
    console.error('Error creating webhook:', error.response.data);
  } else {
    console.error('Error creating webhook:', error.message);
  }
});   

// Проверка наличия продукта
async function checkProductAvailability(productId) {
  try {
    const response = await axios.get(`https://${shopifyStore}/admin/api/2023-04/products/${productId}.json`, {
      headers: {
        'X-Shopify-Access-Token': shopifyAccessToken
      }
    });

    const product = response.data.product;

    if (product) {
      const availableVariants = product.variants.filter(variant => variant.inventory_quantity > 0);

      if (availableVariants.length > 0) {
        console.log(`Product ${product.title} is available in the following variants:`);
        availableVariants.forEach(variant => {
          console.log(`- ${product.title}: ${variant.inventory_quantity} in stock`);
        });
      } else {
        console.log(`Product ${product.title} is out of stock in all variants.`);
      }
    } else {
      console.log('Product not found.');
    }
  } catch (error) {
    if (error.response) {
      console.error('Error fetching product data:', error.response.data);
    } else {
      console.error('Error fetching product data:', error.message);
    }
  }
}

const productId = '8223331942620'; // Замените на ID вашего продукта
checkProductAvailability(productId);