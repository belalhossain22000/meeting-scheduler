// MeetingRequest.controller: Module file for the MeetingRequest.controller functionality.
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import pick from "../../../shared/pick";
import { MeetingRequestService } from "./MeetingRequest.service";

const createMeetingRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingRequestService.createMeetingRequest(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result.message,
    data: result,
  });
});

export const meetingRequestController = {
  createMeetingRequest,
};
