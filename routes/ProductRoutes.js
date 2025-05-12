import express from 'express';
import { itemControllers } from '../controller/ProductContoller.js';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { ITItem, SolarItem } from '../model/ProductModel.js';

const router = express.Router();

// Change to memory storage instead of disk storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (req.path === '/item/import') {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed for import'), false);
    }
  } 
  // Regular file uploads
  else {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/vnd.ms-excel',                    // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'  // .xlsx
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: JPG, PNG, PDF, DOC, DOCX'), false);
    }
  }
};

const upload = multer({ 
  storage: storage, // Using memory storage
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const fileFields = [
  { name: 'attachments', maxCount: 5 },
  { name: 'pictures', maxCount: 5 }
];

router.post('/item', protect, upload.fields(fileFields), itemControllers.createItem);
router.put('/item/:id', protect, upload.fields(fileFields), itemControllers.updateItem);
router.delete('/item/:id', protect, itemControllers.deleteItem);
router.get('/item', protect, itemControllers.getItems);
router.get('/item/:id', protect, itemControllers.getItem);
router.get('/publicAll', itemControllers.getAllPublicItems);
router.post('/item/import', protect, upload.single('file'), itemControllers.importItems);

export default router;