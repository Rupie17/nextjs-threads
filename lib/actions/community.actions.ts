'use server'

import Community from '../models/community.model'
import Thread from '../models/thread.model'
import User from '../models/user.model'
import { connectToDB } from '../mongoose'
import { revalidatePath } from 'next/cache'
import { FilterQuery, SortOrder } from 'mongoose'

export async function createCommunity(
  id: string,
  name: string,
  username: string,
  image: string,
  bio: string,
  createdById: string
) {
  try {
    connectToDB()

    // Find the user with the provided unique id
    const user = await User.findOne({ id: createdById })

    if (!user) {
      throw new Error('User not found')
    }

    // create the new community now that we have the users' id
    const newCommunity = new Community({
      id,
      name,
      username,
      image,
      bio,
      createdById: user._id,
    })

    const createdCommunity = await newCommunity.save()

    // Update user model and attach community to the user who created it
    user.communities.push(createdCommunity._id)
    await user.save()

    return createCommunity
  } catch (error: any) {
    throw new Error(`Cannot create community: ${error.message}`)
  }
}

export async function deleteCommunity(communityId: string) {
  try {
    connectToDB()

    // Find the community by its ID and delete it
    const deletedCommunity = await Community.findByIdAndDelete({
      id: communityId,
    })

    if (!deletedCommunity) {
      throw new Error('Community not found')
    }

    // Delete all threads associated with the community
    await Thread.deleteMany({ community: communityId })

    // Find all users who are part of the community
    const communityUsers = await User.find({ communities: communityId })

    // Remove the community from the 'communities' array for each user
    const updatedUserCommunities = communityUsers.map(user => {
      user.communities.pull(communityId)
      return user.save()
    })

    // use promise.all as you are removing many from the map above and need to commit them all.
    await Promise.all(updatedUserCommunities)

    return deletedCommunity
  } catch (error: any) {
    throw new Error(`Could not delete community: ${error.message}`)
  }
}

export async function addMemberToCommunity(
  communityId: string,
  memberId: string
) {
  try {
    connectToDB()

    // Find the community by its unique id
    const community = await Community.findOne({ id: communityId })

    if (!community) {
      throw new Error('Community not found')
    }

    // Find the user by its unique id
    const user = await User.findOne({ id: memberId })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if the user is already a member of the community
    if (community.members.includes(user._id)) {
      throw new Error('User is already in this community')
    }

    // Add the user's _id to the members array in the community
    user.communities.push(community._id)
    await user.save()

    return community
  } catch (error: any) {
    throw new Error(
      `Member could not be added to the community : ${error.message}`
    )
  }
}

export async function removeUserFromCommunity(
  userId: string,
  communityId: string
) {
  try {
    connectToDB()

    const userIdObject = await User.findOne({ id: userId }, { _id: 1 })

    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    )

    if (!userIdObject) {
      throw new Error('User not found')
    }

    if (!communityIdObject) {
      throw new Error('Community not found')
    }

    // Remove the user's _id from the members array in the community
    await Community.updateOne(
      { _id: communityIdObject._id },
      { $pull: { members: userIdObject._id } }
    )

    // Remove the community's _id from the communities array in the user
    await User.updateOne(
      { _id: userIdObject._id },
      { $pull: { communities: communityIdObject._id } }
    )

    return { success: true }
  } catch (error: any) {
    throw new Error(
      `User could not be removed from the community: ${error.message}`
    )
  }
}

export async function updateCommunityInfo(
  communityId: string,
  name: string,
  username: string,
  image: string
) {
  try {
    connectToDB()

    // Find the community by its _id and update the information
    const updatedCommunity = await Community.findOneAndUpdate(
      { id: communityId },
      { name, username, image }
    )

    if (!updatedCommunity) {
      throw new Error('Community not found')
    }

    return updatedCommunity
  } catch (error: any) {
    throw new Error(`Could not update community info: ${error.message}`)
  }
}

export async function fetchCommunityDetails(id: string) {
  try {
    connectToDB()

    const communityDetails = await Community.findOne({ id }).populate([
      'createdBy',
      {
        path: 'members',
        model: 'User',
        select: 'name username image _id id',
      },
    ])
    return communityDetails
  } catch (error: any) {
    throw new Error(`Cannot fetch community details: ${error.message}`)
  }
}

export async function fetchCommunityPosts(id: string) {
  try {
    connectToDB()

    // get all threads for each community plus the threads of threads.
    const communityPosts = await Community.findById(id).populate({
      path: 'threads',
      model: Thread,
      populate: [
        {
          path: 'author',
          model: User,
          select: 'name image id', // Select the "name" and "_id" fields from the "User" model
        },
        {
          path: 'children',
          model: Thread,
          populate: {
            path: 'author',
            model: User,
            select: 'image _id', // Select the "name" and "_id" fields from the "User" model
          },
        },
      ],
    })

    return communityPosts
  } catch (error: any) {
    throw new Error(`Cannot fetch community Threads: ${error.message}`)
  }
}

export async function fetchCommunities({
  searchString = '',
  pageNumber = 1,
  pageSize = 20,
  sortBy = 'desc',
}: {
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

    // Create an initial query object to filter communities.
    const query: FilterQuery<typeof Community> = {}

    // check if search string exists
    if (searchString.trim() !== '') {
      query.$or = [{ username: { $regex: regex } }, { name: { $regex: regex } }]
    }

    // Define the sort options for the fetched communities based on createdAt field and provided sort order.
    const sortOptions = { createdAt: sortBy }

    // get users based on the sort, page and limit to display.
    const communitiesQuery = Community.find(query)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(pageSize)
      .populate('members')

    const totalCommunitiesCount = await Community.countDocuments(query)

    const communities = await communitiesQuery.exec()

    // now that we know total number of users, is there a next page
    const isNext = totalCommunitiesCount > skipAmount + communities.length

    return { communities, isNext }
  } catch (error: any) {
    throw new Error(`Cannot fetch communities: ${error.message}`)
  }
}
