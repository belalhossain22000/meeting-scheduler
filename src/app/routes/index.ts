import express from "express";
import { userRoutes } from "../modules/User/user.route";
import { AuthRoutes } from "../modules/Auth/auth.routes";
import { ImageRoutes } from "../modules/Image/Image.routes";
import { OtpRoutes } from "../modules/Otp/Otp.routes";
import { roomRoutes } from "../modules/Room/Room.route";
import { equipmentRoutes } from "../modules/Equipment/Equipment.route";
import { roomEquipmentRoutes } from "../modules/RoomEquipment/RoomEquipment.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/images",
    route: ImageRoutes,
  },
  {
    path: "/otp",
    route: OtpRoutes,
  },
  {
    path: "/rooms",
    route: roomRoutes,
  },
  {
    path: "/equipments",
    route: equipmentRoutes,
  },
  {
    path: "/room-equipments",
    route: roomEquipmentRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
