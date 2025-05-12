import asyncHandler from "express-async-handler";
import User from "../model/UserModel.js";
import generateToken from "../helper/generateToken.js";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import ejs from "ejs";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SALT_ROUNDS = 10;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD,
  },
});

export const registerUser = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    companyName,
    companyRole,
    phone,
    state,
    country,
    userType,
  } = req.body;

  // Validate required fields
  const requiredFields = {
    firstName,
    lastName,
    email,
    password,
    companyName,
    companyRole,
    phone,
    state,
    country,
    userType,
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Validate user type
  if (!["IT", "Solar"].includes(userType)) {
    return res.status(400).json({
      message: "User type must be either 'IT' or 'Solar'",
    });
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters long",
    });
  }

  // Check if email is already registered
  const userExists = await User.findOne({ email: email.toLowerCase() });
  if (userExists) {
    return res.status(400).json({ message: "Email is already registered" });
  }

  // Create user with plaintext password
  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password, // Store password as plaintext
    companyName,
    companyRole,
    phone,
    state,
    country,
    userType,
    role: 'user' 

  });

  if (user) {
    const token = generateToken(user._id);
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // await sendRegistrationEmail(user);

    res.status(201).json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      companyName: user.companyName,
      companyRole: user.companyRole,
      phone: user.phone,
      state: user.state,
      country: user.country,
      userType: user.userType,
      password: user.password, 
      token,
      role: user.role || 'user', 

    });
  } else {
    res.status(400).json({ message: "Failed to create user" });
  }
});



export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Include role in the selected fields
  const user = await User.findOne({ email: email.toLowerCase() })
    .select('_id email firstName lastName userType password role companyName companyRole phone state country');
  
  if (!user) {
    return res.status(404).json({ message: "User not found, please sign up" });
  }

  // Password validation logic...
  let isPasswordValid;
  if (user.password.startsWith('$2b$')) {
    isPasswordValid = await bcrypt.compare(password, user.password);
  } else {
    isPasswordValid = password === user.password;
  }

  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = generateToken(user._id);

  // Set cookie...
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // Return complete user data including role and company details
  res.status(200).json({
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    userType: user.userType,
    role: user.role,
    companyName: user.companyName,
    companyRole: user.companyRole,
    phone: user.phone,
    state: user.state,
    country: user.country,
    token,
  });
});
export const getCurrentUser = asyncHandler(async (req, res) => {  
  const user = req.user; // User is attached by the protect middleware
  console.log('User data from database:', user); // Debug log


  if (!user) {
    return res.status(404).json({ message: "User not found!" });
  }

  res.status(200).json({
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    companyName: user.companyName,
    companyRole: user.companyRole,
    phone: user.phone,
    state: user.state,
    country: user.country,
    userType: user.userType,
    isAuthenticated: true,
    role: user.role,

  });
});

export const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  res.status(200).json({ message: "Logged out successfully" });
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const updateFields = [
    "firstName",
    "lastName",
    "companyName",
    "companyRole",
    "phone",
    "state",
    "country",
  ];

  updateFields.forEach((field) => {
    if (req.body[field]) {
      user[field] = req.body[field];
    }
  });

  // Handle password update separately
  if (req.body.password) {
    if (req.body.password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }
    user.password = await bcrypt.hash(req.body.password, SALT_ROUNDS);
  }

  // Handle email update separately to ensure uniqueness
  if (req.body.email && req.body.email !== user.email) {
    const emailExists = await User.findOne({
      email: req.body.email.toLowerCase(),
      _id: { $ne: user._id },
    });

    if (emailExists) {
      return res.status(400).json({ message: "Email is already in use" });
    }
    user.email = req.body.email.toLowerCase();
  }

  const updatedUser = await user.save();
  res.status(200).json({
    _id: updatedUser._id,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    email: updatedUser.email,
    companyName: updatedUser.companyName,
    companyRole: updatedUser.companyRole,
    phone: updatedUser.phone,
    state: updatedUser.state,
    country: updatedUser.country,
    userType: updatedUser.userType,
  });
});

// const sendRegistrationEmail = async (user) => {
//   try {
//     const emailTemplatePath = path.join(__dirname, "../views/template.ejs");
//     const emailHtml = await ejs.renderFile(emailTemplatePath, {
//       firstName: user.firstName,
//       lastName: user.lastName,
//       email: user.email,
//       companyName: user.companyName,
//       companyRole: user.companyRole,
//       phone: user.phone,
//       state: user.state,
//       country: user.country,
//       userType: user.userType,
//       password: user.password,
//       currentYear: new Date().getFullYear(),
//     });

//     // const mailOptions = {
//     //   from: process.env.GMAIL_EMAIL,
//     //   to:  user.email,
//     //   subject: `New ${user.userType} User Registration: ${user.firstName} ${user.lastName}`,
//     //   html: emailHtml,
//     // };

//     // await transporter.sendMail(mailOptions);
//   } catch (error) {
//     console.error("Error sending registration email:", error);
//     throw error;
//   }
// };
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  // Validate input
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      message: "Current password and new password are required" 
    });
  }

  // Validate new password length
  if (newPassword.length < 6) {
    return res.status(400).json({
      message: "New password must be at least 6 characters long"
    });
  }

  // Check if user exists
  if (!user) {
    return res.status(404).json({ 
      message: "User not found" 
    });
  }

  // Verify current password (using direct comparison since current passwords are stored in plaintext)
  if (currentPassword !== user.password) {
    return res.status(401).json({ 
      message: "Current password is incorrect" 
    });
  }

  // Hash the new password before saving
  const salt = await bcrypt.genSalt(10);
  const hashedNewPassword = await bcrypt.hash(newPassword, salt);

  // Update password with hashed version
  user.password = hashedNewPassword;
  await user.save();

  res.status(200).json({ 
    message: "Password updated successfully" 
  });
});