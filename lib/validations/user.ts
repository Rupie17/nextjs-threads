import * as z from 'zod'

export const UserValidation = z.object({
  profile_photo: z.string().url(),
  name: z.string().min(3).max(50),
  username: z.string().min(3).max(50),
  bio: z.string().min(3).max(1000),
})
