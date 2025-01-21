const axios = require('axios');

async function checkProductAvailability(subscriptions, sendNotification, getShopifyConfig) {
  try {
    const requests = subscriptions.map(async (subscription) => {
      const shopifyConfig = getShopifyConfig(subscription.country, subscription);
      if (!shopifyConfig) {
        console.log(`No Shopify credentials configured for country: ${subscription.country}`);
        return;
      }

      const { shopifyStore, shopifyAccessToken } = shopifyConfig;

      try {
        const response = await axios.get(`https://${shopifyStore}/admin/api/2024-10/products/${subscription.inventory_id}.json`, {
          headers: { 'X-Shopify-Access-Token': shopifyAccessToken },
        });

        const product = response.data.product;
        if (product) {
          const availableVariants = product.variants.filter(
            (variant) => variant.inventory_quantity > 0
          );

          if (availableVariants.length > 0) {
            await sendNotification(subscription.email, shopifyConfig);
          }
        }
      } catch (error) {
        console.error(`Error fetching product for subscription ${subscription.inventory_id}:`, error.message);
      }
    });

    await Promise.all(requests);
  } catch (error) {
    console.error('Error fetching subscriptions:', error.message);
  }
}

function getShopifyConfig(country, subscription) {
  const config = {
    US: {
      shopifyStore: process.env.SHOPIFY_US_STORE,
      shopifyAccessToken: process.env.SHOPIFY_US_ACCESS_TOKEN,
    },
    UK: {
      shopifyStore: process.env.SHOPIFY_STORE,
      shopifyAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    },
    DE: {
        shopifyStore: process.env.SHOPIFY_DE_STORE,
        shopifyAccessToken: process.env.SHOPIFY_DE_ACCESS_TOKEN,
      },
    PL:{
        shopifyStore: process.env.SHOPIFY_PL_STORE,
        shopifyAccessToken: process.env.SHOPIFY_PL_ACCESS_TOKEN,
      },
    FR: {
        shopifyStore: process.env.SHOPIFY_FR_STORE,
        shopifyAccessToken: process.env.SHOPIFY_FR_ACCESS_TOKEN,
      },
    IT: {
        shopifyStore: process.env.SHOPIFY_IT_STORE,
        shopifyAccessToken: process.env.SHOPIFY_IT_ACCESS_TOKEN,
      },
    ES: {
        shopifyStore: process.env.SHOPIFY_ES_STORE,
        shopifyAccessToken: process.env.SHOPIFY_ES_ACCESS_TOKEN,
      }
   
  };

  return config[country] || null;
}
module.exports = {
    getShopifyConfig,
    checkProductAvailability,
  };
