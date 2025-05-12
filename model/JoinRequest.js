// models/JoinRequest.js
import mongoose from "mongoose";

const joinRequestSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First name is required"],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, "Last name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please enter a valid email address",
    ],
  },
  phoneNumber: {
    type: String,
    required: [true, "Phone number is required"],
    trim: true,
  },
  state: {
    type: String,
    required: [true, "State is required"],
    trim: true,
  },
  country: {
    type: String,
    required: [true, "Country is required"],
    trim: true,
  },
  companyName: {
    type: String,
    required: [true, "Company name is required"],
    trim: true,
  },
  companyRole: {
    type: String,
    required: [true, "Company role is required"],
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const JoinRequest = mongoose.model("JoinRequest", joinRequestSchema);
export default JoinRequest;