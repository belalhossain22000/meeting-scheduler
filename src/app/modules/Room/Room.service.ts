import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { Prisma } from "@prisma/client";
import { roomSearchAbleFields } from "./Room.constant";
import { paginationHelper } from "../../../helpars/paginationHelper";

const createRoom = async (data: any) => {
  const existingRoom = await prisma.room.findUnique({
    where: { name: data.name },
  });
  if (existingRoom) {
    throw new ApiError(httpStatus.CONFLICT, "Room already exists");
  }

  const result = await prisma.room.create({ data });
  return result;
};

const getAllRooms = async (params: any, options: any) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.RoomWhereInput[] = [];

  if (params.searchTerm) {
    andConditions.push({
      OR: roomSearchAbleFields.map((field) => ({
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
  const whereConditions: Prisma.RoomWhereInput = { AND: andConditions };

  const result = await prisma.room.findMany({
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
  const total = await prisma.room.count({
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

const getSingleRoom = async (id: string) => {
  const result = await prisma.room.findUnique({ where: { id } });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found..!!");
  }
  return result;
};

const updateRoom = async (id: string, data: any) => {
  const existingRoom = await prisma.room.findUnique({ where: { id } });
  if (!existingRoom) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found..!!");
  }
  const result = await prisma.room.update({ where: { id }, data });
  return result;
};

const deleteRoom = async (id: string) => {
  const existingRoom = await prisma.room.findUnique({ where: { id } });
  if (!existingRoom) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found..!!");
  }
   await prisma.room.delete({ where: { id } });
  return null;
};

export const roomService = {
  createRoom,
  getAllRooms,
  getSingleRoom,
  updateRoom,
  deleteRoom,
};
