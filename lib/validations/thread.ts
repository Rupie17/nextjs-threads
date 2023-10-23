import * as z from 'zod'

export const ThreadValidation = z.object({
  thread: z.string().min(3, { message: 'Min 3 chars' }),
  accountId: z.string(),
})

export const CommentValidation = z.object({
  thread: z.string().min(3, { message: 'Min 3 chars' }),
})
