import { z } from "zod";

export const EquipmentSchema = z.object({
    body: z.object({
        name: z.string(),
        email: z.string().email(),
    }),
});
