import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { roomEquipmentService } from "./RoomEquipment.service";


const createRoomEquipment = catchAsync(async (req: Request, res: Response) => {
    const result = await roomEquipmentService.createRoomEquipment(req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "RoomEquipment created successfully",
        data: result,
    });
});

const getAllRoomEquipments = catchAsync(async (req: Request, res: Response) => {
    
    const results = await roomEquipmentService.getAllRoomEquipments(req.query);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "RoomEquipments retrieved successfully",
        data: results,
    });
});

const getSingleRoomEquipment = catchAsync(async (req: Request, res: Response) => {
    const result = await roomEquipmentService.getSingleRoomEquipment(req.params.id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "RoomEquipment retrieved successfully",
        data: result,
    });
});

const updateRoomEquipment = catchAsync(async (req: Request, res: Response) => {
    const result = await roomEquipmentService.updateRoomEquipment(req.params.id, req.body);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "RoomEquipment updated successfully",
        data: result,
    });
});

const deleteRoomEquipment = catchAsync(async (req: Request, res: Response) => {
    const result = await roomEquipmentService.deleteRoomEquipment(req.params.id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "RoomEquipment deleted successfully",
        data: result,
    });
});

export const roomEquipmentController = {
    createRoomEquipment,
    getAllRoomEquipments,
    getSingleRoomEquipment,
    updateRoomEquipment,
    deleteRoomEquipment,
};
