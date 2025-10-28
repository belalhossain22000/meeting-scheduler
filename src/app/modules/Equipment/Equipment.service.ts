import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { paginationHelper } from "../../../helpars/paginationHelper";
import { Prisma } from "@prisma/client";
import { EquipmentSearchAbleFields } from "./Equipment.constant";

const createEquipment = async (data: any) => {
  const existingEquipment = await prisma.equipment.findUnique({
    where: { name: data.name },
  });
  if (existingEquipment) {
    throw new ApiError(httpStatus.CONFLICT, "Equipment already exists");
  }

  const result = await prisma.equipment.create({ data });
  return result;
};

const getAllEquipments = async (params: any, options: any) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.EquipmentWhereInput[] = [];

  if (params.searchTerm) {
    andConditions.push({
      OR: EquipmentSearchAbleFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }
  const whereConditions: Prisma.EquipmentWhereInput = { AND: andConditions };

  const result = await prisma.equipment.findMany({
    where: whereConditions,
    skip,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
  });
  const total = await prisma.equipment.count({
    where: whereConditions,
  });

  if (!result || result.length === 0) {
    throw new ApiError(404, "No active users found");
  }
  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  };
};

const getSingleEquipment = async (id: string) => {
  const result = await prisma.equipment.findUnique({ where: { id } });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Equipment not found..!!");
  }
  return result;
};

const updateEquipment = async (id: string, data: any) => {
  const existingEquipment = await prisma.equipment.findUnique({
    where: { id },
  });
  if (!existingEquipment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Equipment not found..!!");
  }
  const result = await prisma.equipment.update({ where: { id }, data });
  return result;
};

const deleteEquipment = async (id: string) => {
  const existingEquipment = await prisma.equipment.findUnique({
    where: { id },
  });
  if (!existingEquipment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Equipment not found..!!");
  }
  await prisma.equipment.delete({ where: { id } });
  return null;
};

export const equipmentService = {
  createEquipment,
  getAllEquipments,
  getSingleEquipment,
  updateEquipment,
  deleteEquipment,
};
