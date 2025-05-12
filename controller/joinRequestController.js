// controllers/joinRequestController.js
import JoinRequest from '../model/JoinRequest.js';
import asyncHandler from "express-async-handler";

// Create new join request
export const createJoinRequest = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    state,
    country,
    companyName,
    companyRole
  } = req.body;



  const joinRequest = await JoinRequest.create({
    firstName,
    lastName,
    email,
    phoneNumber,
    state,
    country,
    companyName,
    companyRole
  });

  res.status(201).json({
    success: true,
    data: joinRequest
  });
});

export const getAllJoinRequests = asyncHandler(async (req, res) => {
  const requests = await JoinRequest.find()
    .sort({ createdAt: -1 }); 

  res.status(200).json({
    success: true,
    count: requests.length,
    data: requests
  });
});

// Get single join request (admin only)
export const getJoinRequest = asyncHandler(async (req, res) => {
  const request = await JoinRequest.findById(req.params.id);
  
  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Join request not found"
    });
  }

  res.status(200).json({
    success: true,
    data: request
  });
});

// Update join request status (admin only)
export const updateJoinRequestStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value"
    });
  }

  const request = await JoinRequest.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Join request not found"
    });
  }

  res.status(200).json({
    success: true,
    data: request
  });
});

// Delete join request (admin only)
export const deleteJoinRequest = asyncHandler(async (req, res) => {
  const request = await JoinRequest.findByIdAndDelete(req.params.id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Join request not found"
    });
  }

  res.status(200).json({
    success: true,
    message: "Join request deleted successfully"
  });
});