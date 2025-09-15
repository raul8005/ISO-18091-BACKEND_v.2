const mongoose = require('mongoose')

const characteristicSchema = new mongoose.Schema({
  name:{
    type:String,
    required:true
  },
  type:{
    type:Number,
    required:false,
    default:1
  },
  group:{
    type:String,
    required:true
  },
  groupName:{
    type:String,
    required:true
  },
  help:{
    type:String,
    required:false
  },
  format:{
    type:String,
    required:false
  },
  isRequired:{
    type:Boolean,
    required:true
  },
  required:{
    type:Boolean,
    required:true
  },
  score:{
    type:Number,
    required:false
  },
  tier:{
    type:Number,
    required:true
  },
  unique:{
    type:Boolean,
    required:true
  },
  parts:[{
    type:String,
    required:false
  }],
  valuation:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Valuation',
    required:true
  }],
  extras:{
    type:mongoose.Schema.Types.Mixed,
    required:false,
    default:{}
  },
  allowed_formats:[{
    type:String,
    required:true
  }]
})
characteristicSchema.set('toJSON',{
  transform:(doc,returnObj) => {
    if(returnObj._id){
      returnObj.id = returnObj._id.toString()
      delete returnObj._id
      delete returnObj.__v

    }
  }
})

module.exports = mongoose.model('Characteristic',characteristicSchema)