const mongoose = require('mongoose')

const gadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    requred: true,
  },
  city: {
    type: String,
    requred: true,
  },
  country: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  admin: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  ],
  staff: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  ],
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  ],
  state: {
    type: Boolean,
    required: true,
  },
  publishAuto: {
    type: Boolean,
    required: true,
  },
  report:[{
    type: mongoose.Schema.Types.ObjectId,
    ref:'Report',
    required:false,
  }],
  reportDefault:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'Report',
    required:false,
  }
})
gadSchema.set('toJSON', {
  transform: (doc, returnObj) => {
    returnObj.id = returnObj._id.toString()
    delete returnObj._id
    delete returnObj.__v
  },
})

module.exports = mongoose.model('Gad', gadSchema)
