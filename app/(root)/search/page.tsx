import UserCard from '@/components/cards/UserCard'
import { fetchUser, fetchUsers } from '@/lib/actions/user.actions'
import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import Searchbar from '@/components/shared/Searchbar'
import Pagination from '@/components/shared/Pagination'

const Page = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) => {
  const user = await currentUser()
  if (!user) return null

  // we use params.id because you will be on the profile page of the user you clicked on, or your own
  // so you want that id not just your user id as we did in the page.tsx of the create-thread page.
  const userInfo = await fetchUser(user.id)
  if (!userInfo?.onboarded) redirect('/onboarding')

  // Fetch users
  const result = await fetchUsers({
    userId: user.id,
    searchString: searchParams.q,
    pageNumber: searchParams?.page ? +searchParams.page : 1,
    pageSize: 25,
  })

  return (
    <section>
      <h1 className='head-text mb-10'>Search</h1>

      <Searchbar routeType='search' />

      <div className='mt-14 flex flex-col gap-9'>
        {result.users.length === 0 ? (
          <p className='no-result'>No Users</p>
        ) : (
          <>
            {result.users.map(person => (
              <UserCard
                key={person.id}
                id={person.id}
                name={person.name}
                username={person.username}
                imgUrl={person.image}
                // because we can use this card for communtiites we can specify the persontype to distinguish.
                personType='User'
              />
            ))}
          </>
        )}
      </div>
      <Pagination
        path='search'
        pageNumber={searchParams?.page ? +searchParams.page : 1}
        isNext={result.isNext}
      />
    </section>
  )
}

export default Page
