import { Router } from "express";
import { roomEquipmentController } from "./RoomEquipment.controller";

const router = Router();

// create roomEquipment
router.post("/create", roomEquipmentController.createRoomEquipment);

// get all roomEquipment
router.get("/", roomEquipmentController.getAllRoomEquipments);

// get single roomEquipment by id
router.get("/:id", roomEquipmentController.getSingleRoomEquipment);

// update roomEquipment
router.put("/:id", roomEquipmentController.updateRoomEquipment);

// delete roomEquipment
router.delete("/:id", roomEquipmentController.deleteRoomEquipment);

export const roomEquipmentRoutes = router;
