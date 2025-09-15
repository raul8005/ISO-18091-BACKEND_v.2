const indicatorInstanceRouter = require('express').Router()
const  mongoose  = require('mongoose')
const IndicatorInstance = require('../models/indicatorInstance')

//auth
const jwt = require('jsonwebtoken')
const { getTokenFrom } = require('../utils/middleware')
const Rol = require('../models/rol')

const ROL_ADMIN = process.env.ROL_ADMIN



indicatorInstanceRouter.get('/',(req,res,next) => {
  const tenantID = new mongoose.Types.ObjectId(req.header('tenant'))
  if(Object.entries(req.query)===0){
    IndicatorInstance.find({})
      .populate({ path: 'gadID' })
      .populate({ path: 'indicatorID' })
      .populate({ path:'subindicators',model:'SubIndicator' })
      .populate({ path:'subindicators.createdBy',model:'User' })
      .populate({ path:'createdby' })
      .then(indicators => {
        res.json(indicators)
      })
      .catch(error => next(error))
  }else{
    const period = req.query.period
    const quadrant = Number(req.query.quadrant)
    //console.log(quadrant)
    IndicatorInstance.find({ year:period,gadID:tenantID })
      .populate({
        path:'indicatorID',
        populate: { path:'ods' }
      })
      .populate({
        path:'subindicators',
        model:'SubIndicator',
        populate: { path:'createdBy' }
      })
      .then(indicators => {
        res.json(indicators.filter(indicator => indicator.indicatorID.quadrant === quadrant).sort((a,b) => a.indicatorID.number - b.indicatorID.number ))
      })
      .catch(error => next(error))
  }
})

indicatorInstanceRouter.get('/byIndicatorIDAndPeriod',async (req,res,next) => {
  try {
    const indicatorID = new mongoose.Types.ObjectId(req.query.indicatorID)
    const period = new mongoose.Types.ObjectId(req.query.period)
    const tenantID = new mongoose.Types.ObjectId(req.header('tenant'))
    const indicatorInstance = await IndicatorInstance
      .findOne({
        indicatorID:indicatorID,
        period:period,
        gadID:tenantID
      })
      .populate({
        path:'indicatorID',
        populate: { path:'ods' }
      })
      .populate({
        path:'subindicators',
        model:'SubIndicator',
        populate: [
          { path:'createdBy' },
          { path:'evidences' }
        ]
      })
    //console.log(indicatorInstance)
    res.status(200).json(indicatorInstance)
  } catch (error) {
    next(error)
  }
})
indicatorInstanceRouter.get('/byQuadrantAndPeriod',async (req,res,next) => {
  try {
    const quadrant = Number(req.query.quadrant)
    const period = new mongoose.Types.ObjectId(req.query.period)
    const tenantID = new mongoose.Types.ObjectId(req.header('tenant'))
    const options = {
      select: { __v: 0, _id: 0 },
    }
    //console.log(quadrant,period)
    const indicatorInstance = await IndicatorInstance.aggregate([
      {
        $match:{ period:period,gadID:tenantID }
      },
      {
        $lookup:{
          from:'indicators',
          localField:'indicatorID',
          foreignField:'_id',
          as:'indicatorID',
          pipeline:[
            { $project:options.select }
          ]
        }
      },
      {
        $unwind: { path: '$indicatorID', preserveNullAndEmptyArrays: true }
      },
      {

        $lookup:{
          from:'ods',
          localField:'indicatorID.ods',
          foreignField:'_id',
          as:'indicatorID.ods',
          pipeline:[
            { $project:options.select }
          ]
        }
      },
      {
        $lookup:{
          from:'gad',
          localField:'gadID',
          foreignField:'_id',
          as:'gadID',
          pipeline:[
            { $project:options.select }
          ]
        }
      },
      {
        $match: { 'indicatorID.quadrant': quadrant }
      },
      {
        $lookup:{
          from:'subindicators',
          localField:'subindicators',
          foreignField:'_id',
          as:'subindicators',
          pipeline:[
            { $project:options.select }
          ]
        }
      },
      {
        $sort:{ 'indicatorID.number':1 }
      }
    ])
    //console.log(indicatorInstance)
    res.status(200).json(indicatorInstance)
  } catch (error) {
    next(error)
  }
})

indicatorInstanceRouter.get('/summarySubindicators', async (req,res,next) => {
  try {
    const period = new mongoose.Types.ObjectId(req.query.period)
    const tenantID = new mongoose.Types.ObjectId(req.header('tenant'))
    const indicators = await IndicatorInstance.find({ period:period,gadID:tenantID }).populate('subindicators')
    const subindcators = indicators.map(indicator => indicator.subindicators).flat()
    //console.log(subindcators)
    const result = {
      0:0,
      1:0,
      2:0,
      3:0,
    }
    subindcators.forEach(subindicator => {
      const qualify = subindicator.qualification
      //console.log(subindicator)
      if (Object.prototype.hasOwnProperty.call(result,qualify)) {
        result[qualify]++
      }
    })
    console.log(result)
    res.status(200).json({
      qualify_0:result[0],
      qualify_1:result[1],
      qualify_2:result[2],
      qualify_3:result[3],
    })
  } catch (error) {
    next(error)
  }
})

indicatorInstanceRouter.get('/summary',async (req,res,next) => {
  try {
    const period = new mongoose.Types.ObjectId(req.query.period)
    const tenantID = new mongoose.Types.ObjectId(req.header('tenant'))
    const options = {
      select: { __v: 0, _id: 0 },
    }
    let result=[
      {
        quadrantName:'',
        qualify_0:0,
        qualify_1:0,
        qualify_2:0,
        qualify_3:0,
      },
      {
        quadrantName:'',
        qualify_0:0,
        qualify_1:0,
        qualify_2:0,
        qualify_3:0,
      },
      {
        quadrantName:'',
        qualify_0:0,
        qualify_1:0,
        qualify_2:0,
        qualify_3:0,
      },
      {
        quadrantName:'',
        qualify_0:0,
        qualify_1:0,
        qualify_2:0,
        qualify_3:0,
      }
    ]
    for (let i = 1; i <5 ; i++) {
      const indicatorInstance = await IndicatorInstance.aggregate([
        {
          $match:{ period:period,gadID:tenantID }
        },
        {
          $lookup:{
            from:'indicators',
            localField:'indicatorID',
            foreignField:'_id',
            as:'indicatorID',
            pipeline:[
              { $project:options.select }
            ]
          }
        },
        {
          $unwind: { path: '$indicatorID', preserveNullAndEmptyArrays: true }
        },
        {
          $lookup:{
            from:'ods',
            localField:'indicatorID.ods',
            foreignField:'_id',
            as:'indicatorID.ods',
            pipeline:[
              { $project:options.select }
            ]
          }
        },
        {
          $lookup:{
            from:'gad',
            localField:'gadID',
            foreignField:'_id',
            as:'gadID',
            pipeline:[
              { $project:options.select }
            ]
          }
        },
        {
          $match: { 'indicatorID.quadrant': i }
        },
      ])
      //console.log(indicatorInstance[0])
      result[i-1].quadrantName=indicatorInstance[0].indicatorID.quadrantName
      result[i-1].qualify_0=indicatorInstance.filter((indicator) => indicator.qualification===0).length
      result[i-1].qualify_1=indicatorInstance.filter((indicator) => indicator.qualification===1).length
      result[i-1].qualify_2=indicatorInstance.filter((indicator) => indicator.qualification===2).length
      result[i-1].qualify_3=indicatorInstance.filter((indicator) => indicator.qualification===3).length
      //console.log(result)
    }
    res.status(200).json(result)

  } catch (error) {
    next(error)
  }
})

indicatorInstanceRouter.get('/:id',(req,res,next) => {
  const id = req.params.id
  IndicatorInstance.findById(id)
    .populate({
      path:'indicatorID',
      populate: { path:'ods' }
    })
    .populate({
      path:'subindicators',
      model:'SubIndicator',
      populate: [
        { path:'createdBy' },
        { path:'evidences' }
      ]
    })
    .populate('gadID')
    .then(indicator => {
      if(indicator){
        res.json(indicator)
      }else{
        res.status(404).end()
      }
    })
    .catch(error => next(error))
})

indicatorInstanceRouter.delete('/:id',(req,res,next) => {
  const id = req.params.id
  IndicatorInstance.findByIdAndDelete(id)
    .then(() => {
      res.status(204).end()
    })
    .catch(error => next(error))
})

indicatorInstanceRouter.put('/:id',async (req,res,next) => {
  try {
    const body = req.body
    const id = req.params.id
    const arraySubindicators = body.subindicators.map( subindicator => new mongoose.Types.ObjectId(subindicator))
    //Authorizaction
    const token = getTokenFrom(req)
    const decodedToken = jwt.verify(token,process.env.SECRET)
    if(!token||!decodedToken){
      return res.status(401).json({ error: 'token missing or invalid' })
    }else{
      const rolID = decodedToken.rol
      const user = new mongoose.Types.ObjectId(decodedToken.id)
      const rol = await Rol.findById(rolID)
      if(!rol){
        return res.status(401).json({ error: 'rol missing or invalid' })
      }else if(rol.name!==ROL_ADMIN){
        return res.status(401).json({ error: 'unauthorized rol' })
      }
      //end-authorization
      const indicator = {
        qualification:body.qualification,
        lastUpdate: new Date(),
        lastUpdateBy:user,
        subindicators: arraySubindicators
      }
      const updateIndicator = await IndicatorInstance.findByIdAndUpdate(id,indicator,{ new:true })
      res.status(200).json(updateIndicator)
    }
  } catch (error) {
    next(error)
  }
})
module.exports = indicatorInstanceRouter