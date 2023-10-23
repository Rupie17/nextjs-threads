import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  id: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  image: String,
  bio: String,
  threads: [
    {
      // user can have a reference to many threads in the db
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Thread',
    },
  ],
  onboarded: {
    type: Boolean,
    default: false,
  },
  communities: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
    },
  ],
})

// first call the model won't exist so it needs to be created so second part gets executed
// every time after that the first part is going to get called.
const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User
