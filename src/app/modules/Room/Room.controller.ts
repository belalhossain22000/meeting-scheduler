import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { roomService } from "./Room.service";
import pick from "../../../shared/pick";
import { roomFilterableFields } from "./Room.constant";

const createRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await roomService.createRoom(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Room created successfully",
    data: result,
  });
});

const getAllRooms = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, roomFilterableFields);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const results = await roomService.getAllRooms(filters, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rooms retrieved successfully",
    data: results,
  });
});

const getSingleRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await roomService.getSingleRoom(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room retrieved successfully",
    data: result,
  });
});

const updateRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await roomService.updateRoom(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room updated successfully",
    data: result,
  });
});

const deleteRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await roomService.deleteRoom(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room deleted successfully",
    data: result,
  });
});

export const roomController = {
  createRoom,
  getAllRooms,
  getSingleRoom,
  updateRoom,
  deleteRoom,
};
