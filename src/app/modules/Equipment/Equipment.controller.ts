import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { equipmentService } from "./Equipment.service";
import pick from "../../../shared/pick";
import { EquipmentFilterableFields } from "./Equipment.constant";

const createEquipment = catchAsync(async (req: Request, res: Response) => {
  const result = await equipmentService.createEquipment(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Equipment created successfully",
    data: result,
  });
});

const getAllEquipments = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, EquipmentFilterableFields);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const results = await equipmentService.getAllEquipments(filters, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Equipments retrieved successfully",
    data: results,
  });
});

const getSingleEquipment = catchAsync(async (req: Request, res: Response) => {
  const result = await equipmentService.getSingleEquipment(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Equipment retrieved successfully",
    data: result,
  });
});

const updateEquipment = catchAsync(async (req: Request, res: Response) => {
  const result = await equipmentService.updateEquipment(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Equipment updated successfully",
    data: result,
  });
});

const deleteEquipment = catchAsync(async (req: Request, res: Response) => {
  const result = await equipmentService.deleteEquipment(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Equipment deleted successfully",
    data: result,
  });
});

export const equipmentController = {
  createEquipment,
  getAllEquipments,
  getSingleEquipment,
  updateEquipment,
  deleteEquipment,
};
