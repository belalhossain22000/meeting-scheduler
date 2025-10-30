// MeetingRequest.routes: Module file for the MeetingRequest.routes functionality.
import express from "express";
import { meetingRequestController } from "./MeetingRequest.controller";


const router = express.Router();

// create meeting request
router.post(
    "/",
    meetingRequestController.createMeetingRequest
);

export const MeetingRequestRoutes = router;