import asyncHandler from "express-async-handler";
import User from "../model/UserModel.js";

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ID
  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // First check if user exists
    const userExists = await User.findById(id);
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting admin users
    if (userExists.role === 'admin') {
      return res.status(403).json({ message: "Cannot delete admin users" });
    }

    // Proceed with deletion
    const deletedUser = await User.findByIdAndDelete(id);
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: "Error deleting user" });
  }
});




export const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find({});

    if (!users) {
      res.status(404).json({ message: "No users found" });
    }

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Cannot get users" });
  }
});


