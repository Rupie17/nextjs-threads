'use client'

import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form'
import { Button } from '../ui/button'
import { CommentValidation } from '@/lib/validations/thread'
import { usePathname, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '../ui/input'
import Image from 'next/image'
import { addCommmentToThread } from '@/lib/actions/thread.actions'

type Props = {
  threadId: string
  currentUserImg: string
  currentUserId: string
}

const Comment = ({ threadId, currentUserImg, currentUserId }: Props) => {
  const router = useRouter()
  const pathname = usePathname()

  const form = useForm({
    resolver: zodResolver(CommentValidation),
    defaultValues: {
      thread: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof CommentValidation>) => {
    await addCommmentToThread(
      threadId,
      values.thread,
      JSON.parse(currentUserId),
      pathname
    )
    form.reset()
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='comment-form'>
        <FormField
          control={form.control}
          name='thread'
          render={({ field }) => (
            <FormItem className='flex gap-3 items-center w-full'>
              <FormLabel>
                {/* doesnt need any classes because its an image in here not text */}
                <Image
                  src={currentUserImg}
                  alt='Profile Image'
                  width={48}
                  height={48}
                  className='rounded-full object-cover'
                />
              </FormLabel>
              <FormControl className='border-none bg-transparent'>
                <Input
                  type='text'
                  placeholder='Comment...'
                  className='no-focus text-light-1 outline-none'
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button
          type='submit'
          className='comment-form_btn'>
          Reply
        </Button>
      </form>
    </Form>
  )
}

export default Comment
