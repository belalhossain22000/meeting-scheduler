import { z } from "zod";



const CreateUserValidationSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .min(1, "Email is required"),  

  name: z
    .string()
    .min(1, "Name is required"),  

  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .nonempty("Password is required"),

});




const UserLoginValidationSchema = z.object({
  email: z.string().email().nonempty("Email is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .nonempty("Password is required"),
});



export const UserValidation = {
  CreateUserValidationSchema,
  UserLoginValidationSchema,
  
};
