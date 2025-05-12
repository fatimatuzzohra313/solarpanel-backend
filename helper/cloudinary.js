// helper/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDNAME,
  api_key: process.env.APIKEY,
  api_secret: process.env.APISECRET
});

const uploadToCloudinary = async (fileBuffer, options = {}) => {
  if (!fileBuffer) {
    throw new Error('No file buffer provided');
  }

  try {
    // Convert buffer to base64
    const b64 = Buffer.from(fileBuffer).toString('base64');
    const dataURI = "data:image/jpeg;base64," + b64;
    
    // Set default options and merge with provided options
    const uploadOptions = {
      resource_type: 'auto', // This allows Cloudinary to handle different file types
      folder: 'Prouduct',
      ...options
    };

    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(dataURI, uploadOptions);

    // Return the secure URL from the result
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    // Include more error details in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to upload to Cloudinary: ${error.message}`
      : 'Failed to upload file';
    throw new Error(errorMessage);
  }
};

export default uploadToCloudinary;