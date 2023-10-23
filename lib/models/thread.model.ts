import mongoose from 'mongoose'

const threadSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  parentId: {
    type: String,
  },
  children: [
    {
      // this is saying a thread can have multiple threads as children. i.e a comment on a comment.
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Thread',
    },
  ],
})

// first call the model won't exist so it needs to be created so second part gets executed
// every time after that the first part is going to get called.
const Thread = mongoose.models.Thread || mongoose.model('Thread', threadSchema)

export default Thread
