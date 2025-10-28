import { Router } from "express";
import { equipmentController } from "./Equipment.controller";

const router = Router();

// create equipment
router.post("/create", equipmentController.createEquipment);

// get all equipment
router.get("/", equipmentController.getAllEquipments);

// get single equipment by id
router.get("/:id", equipmentController.getSingleEquipment);

// update equipment
router.put("/:id", equipmentController.updateEquipment);

// delete equipment
router.delete("/:id", equipmentController.deleteEquipment);

export const equipmentRoutes = router;
