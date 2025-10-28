import { z } from "zod";

export const RoomSchema = z.object({
    body: z.object({
        name: z.string(),
        email: z.string().email(),
    }),
});
