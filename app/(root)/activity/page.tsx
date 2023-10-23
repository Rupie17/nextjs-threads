import { fetchUser, getActivity } from '@/lib/actions/user.actions'
import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const Page = async () => {
  const user = await currentUser()
  if (!user) return null

  // we use params.id because you will be on the profile page of the user you clicked on, or your own
  // so you want that id not just your user id as we did in the page.tsx of the create-thread page.
  const userInfo = await fetchUser(user.id)
  if (!userInfo?.onboarded) redirect('/onboarding')

  // get Activity ServerAction
  const activity = await getActivity(userInfo._id)

  return (
    <section>
      <h1 className='head-text mb-10'>Activity</h1>
      <section className='mt-10 flex flex-col gap-5'>
        {activity.length > 0 ? (
          <>
            {activity.map(activity => (
              <Link
                key={activity._id}
                href={`/thread/${activity.parentId}`}>
                <article className='activity-card'>
                  <Image
                    src={activity.author.image}
                    alt='profile picture'
                    width={20}
                    height={20}
                    className='roudned-ful object-cover'
                  />
                  <p className='!text-small-regular text-light-1'>
                    <span className='mr-1 text-primary-500'>
                      {activity.author.name}
                    </span>{' '}
                    replied to your thread.
                  </p>
                </article>
              </Link>
            ))}
          </>
        ) : (
          <p className='!text-base-regular text-light-3'>No activity....</p>
        )}
      </section>
    </section>
  )
}

export default Page
