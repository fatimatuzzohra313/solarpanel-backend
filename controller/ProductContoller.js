import { ITItem, SolarItem } from "../model/ProductModel.js";
import uploadToCloudinary from "../helper/cloudinary.js";
import mongoose from "mongoose";
import fs from "fs/promises"; // Use promises version of fs
import path from "path";
import { Readable } from "stream";
import xlsx from "xlsx";
import { parse } from "csv-parse";
import { sendProductNotificationEmails, sendBulkProductNotifications } from "../helper/EmailProduct.js";


export const itemControllers = {
  createItem: async (req, res) => {
    try {
      const { itemType, listingType, ...itemData } = req.body;
      const files = req.files;

      const attachedFileUrls = [];
      const pictureUrls = [];

      // Process attached files
      if (files?.attachments) {
        for (const file of files.attachments) {
          if (!file.buffer) {
            throw new Error(`Missing buffer for file: ${file.originalname}`);
          }

          const fileUrl = await uploadToCloudinary(file.buffer);

          // Only add the file if upload was successful
          if (fileUrl) {
            attachedFileUrls.push({
              fileName: file.originalname,
              fileUrl: fileUrl, // This should now be the Cloudinary secure_url
              fileType: file.mimetype,
            });
          }
        }
      }

      // Process pictures for IT items
      if (itemType === "IT" && files?.pictures) {
        for (const picture of files.pictures) {
          if (!picture.buffer) {
            throw new Error(
              `Missing buffer for picture: ${picture.originalname}`
            );
          }

          const imageUrl = await uploadToCloudinary(picture.buffer);

          // Only add the picture if upload was successful
          if (imageUrl) {
            pictureUrls.push({
              fileName: picture.originalname,
              imageUrl: imageUrl, // This should now be the Cloudinary secure_url
            });
          }
        }
      }

      // Validate that required files were uploaded successfully
      if (files?.attachments?.length > 0 && attachedFileUrls.length === 0) {
        throw new Error("Failed to upload any attachment files");
      }

      if (
        itemType === "IT" &&
        files?.pictures?.length > 0 &&
        pictureUrls.length === 0
      ) {
        throw new Error("Failed to upload any pictures");
      }

      // Prepare item data
      const commonData = {
        ...itemData,
        listingType,
        attachedFiles: attachedFileUrls,
        createdBy: req.user._id,
      };

      // Create the appropriate item type
      let newItem;
      if (itemType === "IT") {
        newItem = await ITItem.create({
          ...commonData,
          pictures: pictureUrls,
        });
      } else {
        newItem = await SolarItem.create(commonData);
      }
      await sendProductNotificationEmails(newItem, req.user);

      res.status(201).json({
        success: true,
        data: newItem,
      });
    } catch (error) {
      console.error("Create item error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create item",
      });
    }
  },
  updateItem: async (req, res) => {
    try {
      const { id } = req.params;
      const { itemType, ...updateData } = req.body;
      const files = req.files;

      // Verify item exists and user has permission
      const ItemModel = itemType === "IT" ? ITItem : SolarItem;
      const existingItem = await ItemModel.findOne({
        _id: id,
        createdBy: req.user._id,
      });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: "Item not found or unauthorized",
        });
      }

      if (files?.attachments) {
        const newAttachedFiles = await Promise.all(
          files.attachments.map(async (file) => {
            const fileUrl = await uploadToCloudinary(file.buffer);
            return {
              fileName: file.originalname,
              fileUrl,
              fileType: file.mimetype,
            };
          })
        );
        updateData.attachedFiles = [
          ...existingItem.attachedFiles,
          ...newAttachedFiles,
        ];
      }

      if (itemType === "IT" && files?.pictures) {
        const newPictures = await Promise.all(
          files.pictures.map(async (picture) => {
            const imageUrl = await uploadToCloudinary(picture.buffer);
            return {
              fileName: picture.originalname,
              imageUrl,
            };
          })
        );
        updateData.pictures = [
          ...(existingItem.pictures || []),
          ...newPictures,
        ];
      }

      const updatedItem = await ItemModel.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      res.status(200).json({
        success: true,
        data: updatedItem,
      });
    } catch (error) {
      console.error("Update item error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Delete item
  deleteItem: async (req, res) => {
    try {
      const { id } = req.params;

      // Use mongoose model to find and delete any type of item
      const deletedItem = await mongoose.model("Item").findOneAndDelete({
        _id: id,
        createdBy: req.user._id,
      });

      if (!deletedItem) {
        return res.status(404).json({
          success: false,
          message: "Item not found or unauthorized",
        });
      }

      res.status(200).json({
        success: true,
        message: "Item deleted successfully",
      });
    } catch (error) {
      console.error("Delete item error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get all items (with optional filtering)
  getItems: async (req, res) => {
    try {
      const { itemType, category, condition, page = 1, limit = 10 } = req.query;

      // Build query
      const query = { createdBy: req.user._id };
      if (itemType) {
        query.itemType = itemType;
      }
      if (category) {
        query.category = category;
      }
      if (condition) {
        query.condition = condition;
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const items = await mongoose
        .model("Item")
        .find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await mongoose.model("Item").countDocuments(query);

      res.status(200).json({
        success: true,
        data: items,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          totalItems: total,
        },
      });
    } catch (error) {
      console.error("Get items error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get single item
  getItem: async (req, res) => {
    try {
      const { id } = req.params;
      const item = await mongoose.model("Item").findOne({
        _id: id,
        createdBy: req.user._id,
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found or unauthorized",
        });
      }

      res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      console.error("Get item error:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // In your itemControllers.js
  getAllPublicItems: async (req, res) => {
    try {
        const {
            itemType,
            category,
            condition,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc",
            userType,
            listingType,
            startDate,
            endDate,
            manufacturer
        } = req.query;

        // Build query
        const query = {};
        if (itemType) query.itemType = itemType;
        if (category) query.category = category;
        if (condition) query.condition = condition;
        if (listingType) query.listingType = listingType;

        // Manufacturer search (case-insensitive)
        if (manufacturer) {
            query.manufacturer = { $regex: manufacturer, $options: 'i' };
        }

        // Date filtering
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                query.createdAt.$lte = endDateTime;
            }
        }

        // Filter by userType
        if (userType) {
            const usersOfType = await mongoose.model("User")
                .find({ userType })
                .select("_id");
            const userIds = usersOfType.map((user) => user._id);
            query.createdBy = { $in: userIds };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

        // Fetch items and total count in parallel
        const [items, total] = await Promise.all([
            mongoose.model("Item")
                .find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort(sortOptions)
                .populate({
                    path: "createdBy",
                    select: "firstName lastName email phone userType",
                    transform: (doc) => {
                        if (doc) {
                            return {
                                firstName: doc.firstName,
                                lastName: doc.lastName,
                                email: doc.email,
                                phoneNumber: doc.phone,  // Map phone to phoneNumber
                                userType: doc.userType
                            };
                        }
                        return null;
                    }
                })
                .lean(),
            mongoose.model("Item").countDocuments(query)
        ]);

        // Format response
        const formattedItems = items.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            price: parseFloat(item.price.toFixed(2))
        }));

        res.status(200).json({
            success: true,
            data: formattedItems,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                totalItems: total,
                pageSize: parseInt(limit)
            }
        });
    } catch (error) {
        console.error("Get public items error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
},


  importItems: async (req, res) => {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded or invalid file",
      });
    }
  
    try {
      let items = [];
      const listingType = req.body.listingType;
  
      // Process file based on mimetype
      if (req.file.mimetype === "text/csv") {
        items = await processCsvFile(req.file.buffer);
      } else if (
        req.file.mimetype === "application/vnd.ms-excel" ||
        req.file.mimetype ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        items = await processExcelFile(req.file.buffer);
      } else {
        return res.status(400).json({
          success: false,
          error: "Invalid file type. Only CSV and Excel files are supported.",
        });
      }
  
      const results = {
        successful: [],
        failed: [],
      };
  
      // Process each item
      for (const itemData of items) {
        try {
          validateItemData(itemData);
  
          const ItemModel =
            itemData.itemType?.toLowerCase() === "solaritem"
              ? SolarItem
              : ITItem;
  
          const item = new ItemModel({
            ...itemData,
            listingType,
            createdBy: req.user._id,
          });
  
          const savedItem = await item.save();
          // Store the full item data in successful array for email notifications
          results.successful.push(savedItem); // Changed to store the full saved item
        } catch (error) {
          results.failed.push({
            wattage: itemData.wattage || "Unknown wattage",
            error: error.message,
          });
        }
      }
  
      // Send notifications using the full saved items
      await sendBulkProductNotifications(results.successful, req.user);
  
      return res.status(200).json({
        success: true,
        message: "File processed",
        summary: {
          total: items.length,
          successful: results.successful.length,
          failed: results.failed.length,
        },
        results: {
          successful: results.successful.map(item => ({
            wattage: item.wattage,
            id: item._id
          })),
          failed: results.failed
        },
      });
    } catch (error) {
      console.error("Import error:", error);
      return res.status(500).json({
        success: false,
        error: "Error processing file",
        details: error.message,
      });
    }
  }
};

// Helper function to process CSV files
const processCsvFile = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];

    // Create readable stream from buffer
    const stream = Readable.from(buffer.toString());

    stream
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        })
      )
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
};

// Helper function to process Excel files
const processExcelFile = (buffer) => {
  try {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  } catch (error) {
    throw new Error(`Error processing Excel file: ${error.message}`);
  }
};

// Helper function to validate item data
const validateItemData = (data) => {
  const requiredFields = [
    "category",
    "partNumber",
    "wattage",
    "manufacturer",
    "price",
    "quantity",
    "condition",
    "warranty",
    "location",
  ];

  const missingFields = requiredFields.filter((field) => !data[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  // Validate numeric fields
  if (isNaN(parseFloat(data.price)) || parseFloat(data.price) < 0) {
    throw new Error("Invalid price value");
  }
  if (isNaN(parseInt(data.quantity)) || parseInt(data.quantity) < 0) {
    throw new Error("Invalid quantity value");
  }
};
