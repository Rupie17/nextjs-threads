'use server'

import Community from '../models/community.model'
import Thread from '../models/thread.model'
import User from '../models/user.model'
import { connectToDB } from '../mongoose'
import { revalidatePath } from 'next/cache'
import { FilterQuery, SortOrder } from 'mongoose'

type Params = {
  userId: string
  username: string
  name: string
  bio: string
  image: string
  path: string
}

// params wrapped in an object as params so you can write them in any order you like when calling the funciton.
export async function updateUser({
  userId,
  username,
  name,
  bio,
  image,
  path,
}: Params): Promise<void> {
  connectToDB()
  try {
    await User.findOneAndUpdate(
      { id: userId },
      { username: username.toLowerCase(), name, bio, image, onboarded: true },
      { upsert: true }
    )

    if (path === '/profile/edit') {
      revalidatePath(path)
    }
  } catch (error: any) {
    throw new Error(`Failed to create/update user: ${error.message}`)
  }
}

export async function fetchUser(userId: string) {
  try {
    connectToDB()

    return await User.findOne({ id: userId }).populate({
      path: 'communities',
      model: Community,
    })
  } catch (error: any) {
    throw new Error(`Failed to fetch user: ${error.message}`)
  }
}

export async function fetchUserPosts(userId: string) {
  try {
    connectToDB()

    // Find all threads authored by user with the given user Id
    const threads = await User.findOne({ id: userId }).populate({
      path: 'threads',
      model: Thread,
      populate: {
        path: 'children',
        model: Thread,
        populate: {
          path: 'author',
          model: User,
          select: 'name image id',
        },
      },
    })

    return threads
  } catch (error: any) {
    throw new Error(`Cannot fetch users threads: ${error.message}`)
  }
}

export async function fetchUsers({
  userId,
  searchString = '',
  pageNumber = 1,
  pageSize = 20,
  sortBy = 'desc',
}: {
  userId: String
  searchString?: string
  pageNumber?: number
  pageSize?: number
  sortBy?: SortOrder
}) {
  try {
    connectToDB()

    const skipAmount = (pageNumber - 1) * pageSize

    // case insensitive search
    const regex = new RegExp(searchString, 'i')

    // get all users
    const query: FilterQuery<typeof User> = {
      // ne is not equal, filter out our current user.
      id: { $ne: userId },
    }
    // check if search string exists
    if (searchString.trim() !== '') {
      query.$or = [{ username: { $regex: regex } }, { name: { $regex: regex } }]
    }

    // define sort options
    const sortOptions = { createdAt: sortBy }

    // get users based on the sort, page and limit to display.
    const usersQuery = User.find(query)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(pageSize)

    const totalUsersCount = await User.countDocuments(query)

    const users = await usersQuery.exec()

    // now that we know total number of users, is there a next page
    const isNext = totalUsersCount > skipAmount + users.length

    return { users, isNext }
  } catch (error: any) {
    throw new Error(`Cannot get users: ${error.message}`)
  }
}

export async function getActivity(userId: string) {
  try {
    connectToDB()

    // find all threads created by the user
    const userThreads = await Thread.find({ author: userId })

    // collect all the child thread ids (replies) from the children field.
    // add them to a new array
    const childThreadIds = userThreads.reduce((acc, userThread) => {
      return acc.concat(userThread.children)
    }, [])

    // find all the threads that the user has replied to excluding the ones created by current user.
    const replies = await Thread.find({
      _id: { $in: childThreadIds },
      author: { $ne: userId },
    }).populate({
      path: 'author',
      model: User,
      select: 'name image _id',
    })
    return replies
  } catch (error: any) {
    throw new Error(`Could not get activity: ${error.message}`)
  }
}
