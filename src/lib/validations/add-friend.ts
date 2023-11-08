import { z } from 'zod' // defines schemas that validates the user input

export const addFriendValidator = z.object({
    email: z.string().email(),
})