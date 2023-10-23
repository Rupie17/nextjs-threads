'use server'

import Community from '../models/community.model'
import Thread from '../models/thread.model'
import User from '../models/user.model'
import { connectToDB } from '../mongoose'
import { revalidatePath } from 'next/cache'

type Params = {
  text: string
  author: string
  communityId: string | null
  path: string
}

export async function createThread({
  text,
  author,
  communityId,
  path,
}: Params) {
  try {
    connectToDB()

    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    )

    const createdThread = await Thread.create({
      text,
      author,
      community: communityIdObject, // Assign communityId if provided, or leave it null for personal account
    })

    // Update User model
    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    })

    if (communityIdObject) {
      // Update Community model
      await Community.findByIdAndUpdate(communityIdObject, {
        $push: { threads: createdThread._id },
      })
    }

    revalidatePath(path)
  } catch (error: any) {
    throw new Error(`Failed to create thread: ${error.message}`)
  }
}

export async function fetchThreads(pageNumber = 1, pageSize = 20) {
  try {
    connectToDB()
    // calc numb of posts to skip
    const skipAmount = (pageNumber - 1) * pageSize
    // fetch threads that have no parents, so top level threads.

    const threadQuery = Thread.find({
      parentId: { $in: [null, undefined] },
    })
      .sort({ createdAt: 'desc' })
      .skip(skipAmount)
      .limit(pageSize)
      .populate({ path: 'author', model: User })
      .populate({
        path: 'children',
        populate: {
          path: 'author',
          model: User,
          select: '_id name parentId image',
        },
      })

    const totalThreadCount = await Thread.countDocuments({
      parentId: { $in: [null, undefined] },
    })
    const threads = await threadQuery.exec()

    const isNext = totalThreadCount > skipAmount + threads.length

    return { threads, isNext }
  } catch (error: any) {
    throw new Error(`Could not fetch threads: ${error.message}`)
  }
}

export async function fetchThreadById(threadId: string) {
  connectToDB()

  try {
    const thread = await Thread.findById(threadId)
      .populate({
        path: 'author',
        model: User,
        select: '_id id name image',
      }) // Populate the author field with _id and username
      .populate({
        path: 'community',
        model: Community,
        select: '_id id name image',
      }) // Populate the community field with _id and name
      .populate({
        path: 'children', // Populate the children field
        populate: [
          {
            path: 'author', // Populate the author field within children
            model: User,
            select: '_id id name parentId image', // Select only _id and username fields of the author
          },
          {
            path: 'children', // Populate the children field within children
            model: Thread, // The model of the nested children (assuming it's the same "Thread" model)
            populate: {
              path: 'author', // Populate the author field within nested children
              model: User,
              select: '_id id name parentId image', // Select only _id and username fields of the author
            },
          },
        ],
      })
      .exec()

    return thread
  } catch (error: any) {
    throw new Error(`Cannot find thread: ${error.message}`)
  }
}

export async function addCommmentToThread(
  threadId: string,
  commentText: string,
  userId: string,
  path: string
) {
  connectToDB()

  try {
    // find original thrad by its ID
    const originalThread = await Thread.findById(threadId)
    if (!originalThread) {
      throw new Error('Thread not found')
    }

    // create a new thread with the comment text
    const commentThread = new Thread({
      text: commentText,
      author: userId,
      parentId: threadId,
    })

    // save the new thread
    const savedCommentThread = await commentThread.save()

    // update the original thread to include the new comment
    originalThread.children.push(savedCommentThread._id)

    // save original thread
    await originalThread.save()
    revalidatePath(path)
  } catch (error: any) {
    throw new Error(`Error adding comment: ${error.message}`)
  }
}

async function fetchAllChildThreads(threadId: string): Promise<any[]> {
  const childThreads = await Thread.find({ parentId: threadId })

  const descendantThreads = []
  for (const childThread of childThreads) {
    const descendants = await fetchAllChildThreads(childThread._id)
    descendantThreads.push(childThread, ...descendants)
  }

  return descendantThreads
}

export async function deleteThread(id: string, path: string): Promise<void> {
  try {
    connectToDB()

    // Find the thread to be deleted (the main thread)
    const mainThread = await Thread.findById(id).populate('author community')

    if (!mainThread) {
      throw new Error('Thread not found')
    }

    // Fetch all child threads and their descendants recursively
    const descendantThreads = await fetchAllChildThreads(id)

    // Get all descendant thread IDs including the main thread ID and child thread IDs
    const descendantThreadIds = [
      id,
      ...descendantThreads.map(thread => thread._id),
    ]

    // Extract the authorIds and communityIds to update User and Community models respectively
    const uniqueAuthorIds = new Set(
      [
        ...descendantThreads.map(thread => thread.author?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainThread.author?._id?.toString(),
      ].filter(id => id !== undefined)
    )

    const uniqueCommunityIds = new Set(
      [
        ...descendantThreads.map(thread => thread.community?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainThread.community?._id?.toString(),
      ].filter(id => id !== undefined)
    )

    // Recursively delete child threads and their descendants
    await Thread.deleteMany({ _id: { $in: descendantThreadIds } })

    // Update User model
    await User.updateMany(
      { _id: { $in: Array.from(uniqueAuthorIds) } },
      { $pull: { threads: { $in: descendantThreadIds } } }
    )

    // Update Community model
    await Community.updateMany(
      { _id: { $in: Array.from(uniqueCommunityIds) } },
      { $pull: { threads: { $in: descendantThreadIds } } }
    )

    revalidatePath(path)
  } catch (error: any) {
    throw new Error(`Failed to delete thread: ${error.message}`)
  }
}
