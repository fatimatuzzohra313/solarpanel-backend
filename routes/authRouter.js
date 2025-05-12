import express from "express";
import { getCurrentUser, loginUser, logoutUser, registerUser, updatePassword, updateUserProfile } from "../controller/userController.js";
import { adminMiddleware, creatorMiddleware, protect } from "../middleware/authMiddleware.js";
import { deleteUser, getAllUsers } from "../controller/adminContoller.js";
import { 
  createJoinRequest, 
  getAllJoinRequests, 
  getJoinRequest, 
  updateJoinRequestStatus, 
  deleteJoinRequest 
} from "../controller/joinRequestController.js";

const route = express.Router();

// Auth & User Routes
route.post("/register", registerUser);
route.post("/login", loginUser);
route.get('/logoutUser', logoutUser);
route.get("/profile", protect, getCurrentUser);
route.patch("/updateProfile", protect, updateUserProfile);``
route.patch("/updatePassword", protect, updatePassword);

// Admin User Management Routes
route.delete("/admin/users/:id", protect, adminMiddleware, deleteUser);
route.get("/admin/users", protect, creatorMiddleware, getAllUsers);

// Join Request Routes
// Public route for creating join requests
route.post("/join-requests", createJoinRequest);

// Admin/Creator only join request management routes
route.get("/admin/join-requests", protect, creatorMiddleware, getAllJoinRequests);
route.get("/admin/join-requests/:id", protect, creatorMiddleware, getJoinRequest);
route.patch("/admin/join-requests/:id", protect, creatorMiddleware, updateJoinRequestStatus);
route.delete("/admin/join-requests/:id", protect, creatorMiddleware, deleteJoinRequest);

export default route;