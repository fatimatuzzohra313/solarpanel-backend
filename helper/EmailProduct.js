import nodemailer from "nodemailer";
import User from "../model/UserModel.js";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// Function to normalize item type to user type
function normalizeItemType(itemType) {
  // Convert 'ITItem' to 'IT' and 'SolarItem' to 'Solar'
  if (itemType === 'ITItem') return 'IT';
  if (itemType === 'SolarItem') return 'Solar';
  return itemType; // For cases where it's already normalized
}

// Function to get all users of a specific type
async function getUsersByType(itemType) {
  const userType = normalizeItemType(itemType);
  console.log('Looking for users of type:', userType); // Debug log
  
  const users = await User.find({ userType }).select('email firstName lastName');
  console.log(`Found ${users.length} users for type ${userType}`); // Debug log
  
  return users;
}

// Function to send product notification emails
// Inside sendProductNotificationEmails function, update the template path:
async function sendProductNotificationEmails(product, uploaderInfo) {
  try {
    const users = await getUsersByType(product.itemType);
    
    if (!users.length) {
      console.log(`No ${normalizeItemType(product.itemType)} users found to notify`);
      return;
    }

    const emailTemplatePath = path.join(__dirname, "../views/product-notification.ejs");
    
    const normalizedProductType = normalizeItemType(product.itemType);

    // Format price for display
    const formattedPrice = typeof product.price === 'number' 
      ? product.price.toFixed(2)
      : parseFloat(product.price).toFixed(2);

    // Calculate price per watt if wattage exists
    const pricePerWatt = product.wattage 
      ? (product.price / product.wattage).toFixed(2)
      : null;

    const emailPromises = users.map(async (user) => {
      try {
        const emailHtml = await ejs.renderFile(emailTemplatePath, {
          userName: user.firstName || 'Valued Customer',
          uploaderName: `${uploaderInfo.firstName} ${uploaderInfo.lastName}`,
          uploaderCompany: uploaderInfo.companyName || '',
          productType: normalizedProductType,
          listingType: product.listingType || 'Sale', // Provide default
          productDetails: {
            category: product.category,
            partNumber: product.partNumber,
            manufacturer: product.manufacturer,
            condition: product.condition,
            price: formattedPrice,
            wattage: product.wattage,
            pricePerWatt: pricePerWatt,
            quantity: product.quantity
          },
          currentYear: new Date().getFullYear(),
          viewListingUrl: process.env.FRONTEND_URL + `/product/${product._id}` || '#'
        });

        const mailOptions = {
          from: process.env.GMAIL_EMAIL,
          to: user.email,
          subject: `New ${normalizedProductType} ${product.listingType || 'Sale'} Listing: ${product.category} - ${product.partNumber}`,
          html: emailHtml
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${user.email}`);
        return result;
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
        return null;
      }
    });

    const results = await Promise.all(emailPromises);
    console.log(`Completed sending ${results.filter(Boolean).length} emails out of ${users.length} attempts`);
  } catch (error) {
    console.error("Error in sendProductNotificationEmails:", error);
    throw error;
  }
}
  
  // For bulk notifications, use the bulk template:
  async function sendBulkProductNotifications(products, uploaderInfo) {
    try {
      const groupedProducts = products.reduce((acc, product) => {
        const type = normalizeItemType(product.itemType);
        if (!acc[type]) acc[type] = [];
        acc[type].push(product);
        return acc;
      }, {});
  
      // Use bulk notification template
      const emailTemplatePath = path.join(__dirname, "../views/bulk-product-notification.ejs");
  
      for (const type in groupedProducts) {
        const users = await getUsersByType(type);
        if (!users.length) {
          console.log(`No ${type} users found to notify for bulk upload`);
          continue;
        }
  
        const productsOfType = groupedProducts[type];
  
        const emailPromises = users.map(async (user) => {
          try {
            const emailHtml = await ejs.renderFile(emailTemplatePath, {
              userName: user.firstName,
              uploaderName: `${uploaderInfo.firstName} ${uploaderInfo.lastName}`,
              uploaderCompany: uploaderInfo.companyName,
              products: productsOfType, // Pass the array of products
              productType: type,
              currentYear: new Date().getFullYear()
            });
  
            const mailOptions = {
              from: process.env.GMAIL_EMAIL,
              to: user.email,
              subject: `New Bulk ${type} Upload: ${productsOfType.length} Products Added`,
              html: emailHtml
            };
  
            return transporter.sendMail(mailOptions);
          } catch (error) {
            console.error(`Failed to send bulk email to ${user.email}:`, error);
            return null;
          }
        });
  
        await Promise.all(emailPromises);
      }
    } catch (error) {
      console.error("Error in sendBulkProductNotifications:", error);
      throw error;
    }
  }

export { sendProductNotificationEmails, sendBulkProductNotifications };