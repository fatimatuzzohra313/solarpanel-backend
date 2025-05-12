import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import xlsx from 'xlsx';
import { Item, ITItem, SolarItem } from '../model/ProductModel'
import { createReadStream } from 'fs';
import fs from 'fs/promises';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || 
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and Excel files are allowed'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter
});

// Helper to validate required fields
const validateItemData = (data) => {
  const requiredFields = [
    'category', 'partNumber', 'sku', 'manufacturer',
    'price', 'quantity', 'condition', 'warranty', 'location'
  ];

  const missingFields = requiredFields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate numeric fields
  if (isNaN(data.price) || data.price < 0) {
    throw new Error('Invalid price value');
  }
  if (isNaN(data.quantity) || data.quantity < 0) {
    throw new Error('Invalid quantity value');
  }
};

// Process Excel file
const processExcelFile = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
};

// Process CSV file
const processCsvFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// File upload route
router.post('/upload', upload.single('file'), async (req, res) => {
  const { file } = req;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Process file based on type
    let items = [];
    if (file.mimetype === 'text/csv') {
      items = await processCsvFile(file.path);
    } else {
      items = await processExcelFile(file.path);
    }

    const results = {
      successful: [],
      failed: []
    };

    // Process each item
    for (const itemData of items) {
      try {
        // Validate data
        validateItemData(itemData);

        // Determine item type and create appropriate model
        let ItemModel;
        switch (itemData.itemType?.toLowerCase()) {
          case 'ititem':
            ItemModel = ITItem;
            break;
          case 'solaritem':
            ItemModel = SolarItem;
            break;
          default:
            ItemModel = Item;
        }

        // Create and save item
        const item = new ItemModel(itemData);
        const savedItem = await item.save();
        results.successful.push({
          sku: itemData.sku,
          id: savedItem._id
        });
      } catch (error) {
        results.failed.push({
          sku: itemData.sku || 'Unknown SKU',
          error: error.message
        });
      }
    }

    // Cleanup: Remove uploaded file
    await fs.unlink(file.path);

    // Send response
    return res.status(200).json({
      message: 'File processed',
      summary: {
        total: items.length,
        successful: results.successful.length,
        failed: results.failed.length
      },
      results: results
    });

  } catch (error) {
    // Cleanup on error
    if (file.path) {
      await fs.unlink(file.path).catch(() => {});
    }
    return res.status(500).json({ 
      error: 'Error processing file',
      details: error.message 
    });
  }
});

export default router;