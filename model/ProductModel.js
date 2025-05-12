import mongoose from "mongoose";

// Define the base schema fields
const baseItemFields = {
  category: {
    type: String,
    required: [true, "Category is required"],
    trim: true
  },
  partNumber: {
    type: String,
    required: [true, "Part number is required"],
    trim: true
  },
  wattage: {
    type: String,
    trim: true
  },
  manufacturer: {
    type: String,
    required: [true, "Manufacturer is required"],
    trim: true
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"]
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [0, "Quantity cannot be negative"]
  },
  condition: {
    type: String,
    required: [true, "Condition is required"],
    trim: true
  },
  warranty: {
    type: String,
    required: [true, "Warranty information is required"],
    trim: true
  },
  location: {
    type: String,
    required: [true, "Location is required"],
    trim: true
  },
  additionalComments: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    trim: true
  },
  attachedFiles: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  listingType: {
    type: String,
    required: [true, "Listing type is required"],
    enum: ['Sell', 'Buy'],
    default: 'Sell'
  },
};

// Define the base schema with options
const baseSchema = new mongoose.Schema(baseItemFields, {
  timestamps: true, // Enable timestamps for all models
  discriminatorKey: 'itemType' // Use a discriminator key
});

// Define the base model
const Item = mongoose.model('Item', baseSchema);

// Define the ITItem schema
const ITItemSchema = new mongoose.Schema({
  pictures: [{
    fileName: String,
    imageUrl: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }]
});

// Define the SolarItem schema
const SolarItemSchema = new mongoose.Schema({});

// Create discriminators
const ITItem = Item.discriminator('ITItem', ITItemSchema);
const SolarItem = Item.discriminator('SolarItem', SolarItemSchema);

export { Item, ITItem, SolarItem };
