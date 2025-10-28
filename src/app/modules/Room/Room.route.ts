import { Router } from "express";
import { roomController } from "./Room.controller";

const router = Router();

// create room
router.post("/", roomController.createRoom);

// get all room
router.get("/", roomController.getAllRooms);

// get single room by id
router.get("/:id", roomController.getSingleRoom);

// update room
router.put("/:id", roomController.updateRoom);

// delete room
router.delete("/:id", roomController.deleteRoom);

export const roomRoutes = router;
