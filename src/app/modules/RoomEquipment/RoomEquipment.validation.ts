import { z } from "zod";

export const RoomEquipmentSchema = z.object({
    body: z.object({
        name: z.string(),
        email: z.string().email(),
    }),
});
