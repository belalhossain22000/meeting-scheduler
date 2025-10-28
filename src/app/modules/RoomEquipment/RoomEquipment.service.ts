import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { RoomEquipmentCreateInput } from "./RoomEquipment.interface";

const createRoomEquipment = async (data: RoomEquipmentCreateInput) => {
  const { roomId, equipmentId } = data;

  const roomExists = await prisma.room.findUnique({ where: { id: roomId } });
  if (!roomExists) {
    throw new Error(`Room with id ${roomId} does not exist`);
  }

  const equipmentExists = await prisma.equipment.findUnique({
    where: { id: equipmentId },
  });
  if (!equipmentExists) {
    throw new Error(`Equipment with id ${equipmentId} does not exist`);
  }

  const result = await prisma.roomEquipment.create({
    data: {
      roomId,
      equipmentId,
    },
  });

  return result;
};

const getAllRoomEquipments = async (query: Record<string, any>) => {
  const result = await prisma.roomEquipment.findMany({
    include: { room: true, equipment: true },
  });
  return result;
};

const getSingleRoomEquipment = async (id: string) => {
  const result = await prisma.roomEquipment.findUnique({
    where: { id },
    include: { room: true, equipment: true },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "RoomEquipment not found..!!");
  }
  return result;
};

const updateRoomEquipment = async (id: string, data: any) => {
  const existingRoomEquipment = await prisma.roomEquipment.findUnique({
    where: { id },
  });
  if (!existingRoomEquipment) {
    throw new ApiError(httpStatus.NOT_FOUND, "RoomEquipment not found..!!");
  }
  const result = await prisma.roomEquipment.update({ where: { id }, data });
  return result;
};

const deleteRoomEquipment = async (id: string) => {
  const existingRoomEquipment = await prisma.roomEquipment.findUnique({
    where: { id },
  });
  if (!existingRoomEquipment) {
    throw new ApiError(httpStatus.NOT_FOUND, "RoomEquipment not found..!!");
  }
 await prisma.roomEquipment.delete({ where: { id } });
  return null;
};

export const roomEquipmentService = {
  createRoomEquipment,
  getAllRoomEquipments,
  getSingleRoomEquipment,
  updateRoomEquipment,
  deleteRoomEquipment,
};
