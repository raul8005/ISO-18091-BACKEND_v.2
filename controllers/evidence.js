/* eslint-disable no-unused-vars */
const evidenveRouter = require('express').Router()
const Evidenve = require('../models/evidence')
//const { default: mongoose } = require('mongoose')
const Subindicator = require('../models/subindicator')
const jwt = require('jsonwebtoken')
const { getTokenFrom, notify, updateSubindicator, updateSubindicator2 } = require('../utils/middleware')
const Rol = require('../models/rol')
const IndicatorInstance = require('../models/indicatorInstance')
const  mongoose  = require('mongoose')
const Commit = require('../models/commit')
const Rubric = require('../models/rubric')

const Characteristic = require('../models/characteristic')
const ROL_ADMIN = process.env.ROL_ADMIN
//const ROL_REPONSIBLE = process.env.ROL_REPONSIBLE
const ROL_USER = process.env.ROL_USER

evidenveRouter.get('/',(req,res,next) => {
  Evidenve.find({})
    .then(evidenves => {
      res.json(evidenves)
    })
    .catch(error => next(error))
})

evidenveRouter.get('/subindicatorID/:id', async (req,res,next) => {
  try {
    const id = req.params.id
    const evidences = await Evidenve.find({ subIndicatorID:id })
      .populate('author')
      .populate({ path: 'commits', model: 'Commit', populate: { path: 'autor', model: 'User' } })
    //console.log(evidences[0].commits)
    res.status(200).json(evidences)
  } catch (error) {
    next(error)
  }
})

evidenveRouter.get('/:id',async(req,res,next) => {
  try {
    const id = req.params.id
    const evidence = await Evidenve.findById(id)
      .populate('author')
      .populate('characteristicID')
      .populate('subIndicatorID')
      .populate('commits')
      .populate({
        path: 'rubric',
        populate: {
          path: 'valuation'
        }
      })
    if(evidence){
      return res.status(200).json(evidence)
    }else{
      return res.status(404).end()
    }
  } catch (error) {
    next(error)
  }

})

evidenveRouter.delete('/:id',async (req,res,next) => {
  try {
    //Authorizaction
    const token = getTokenFrom(req)
    const decodedToken = jwt.verify(token,process.env.SECRET)
    if(!token||!decodedToken){
      return res.status(401).json({ error: 'token missing or invalid' })
    }else{
      const rolID = decodedToken.rol
      const user = decodedToken.id
      const rol = await Rol.findById(rolID)
      if(!rol){
        return res.status(401).json({ error: 'rol missing or invalid' })
      }else if(rol.name!==ROL_ADMIN){
        //console.log('rol',rol.name)
        return res.status(401).json({ error: 'unauthorized rol' })
      }
      //end-authorization
      const id = req.params.id
      const evidenceDelete = await Evidenve.findByIdAndDelete(id)
      //console.log(evidenceDelete)
      const subindicatorBD = await Subindicator.findById(evidenceDelete.subIndicatorID)
        .populate({
          path:'evidences'
        })
        .populate({
          path:'typeID',
          populate:{
            path:'characteristics'
          }
        })
      //console.log(subindicatorBD)
      //const x = subindicatorBD.evidences.findIndex(evi => evi.equals(evidenceDelete._id))
      //console.log(x)
      //console.log('1:',subindicatorBD.evidences.length)
      //subindicatorBD.evidences.splice(x,1)
      const subindicatorUpdated = autoQualifySubindicator(subindicatorBD)
      subindicatorUpdated.lastUpdate=new Date()
      subindicatorUpdated.lastUpdateBy = user
      //console.log('2:',subindicatorUpdated.evidences.length)
      await Subindicator.findByIdAndUpdate(subindicatorUpdated.id,subindicatorUpdated,{ new:true })

      //console.log(subindicatorUpdated)
      const indicatorBD = await IndicatorInstance.findById(subindicatorUpdated.indicadorID)
        .populate({
          path: 'subindicators',
        })
      //console.log(indicatorBD)
      const inddicatorUpdated = autoQualificationIndicator(indicatorBD)
      inddicatorUpdated.lastUpdate=new Date()
      inddicatorUpdated.lastUpdateBy = user
      await IndicatorInstance.findByIdAndUpdate(inddicatorUpdated.id,inddicatorUpdated,{ new:true })
      return res.json({ message:'evidencia eliminada con exito' })
    }
  } catch (error) {
    next(error)
  }
})
evidenveRouter.post('/',async (req,res,next) => {
  try {
    const body = req.body
    //Authorizaction
    const token = getTokenFrom(req)
    const decodedToken = jwt.verify(token,process.env.SECRET)
    if(!token||!decodedToken){
      return res.status(401).json({ error: 'token missing or invalid' })
    }else{
      const rolID = decodedToken.rol
      const user = decodedToken.id
      const rol = await Rol.findById(rolID)
      if(!rol){
        return res.status(401).json({ error: 'rol missing or invalid' })
      }else if(rol.name===ROL_USER){
        return res.status(401).json({ error: 'unauthorized rol' })
      }
      //end-authorization
      if(body.name===undefined){
        res.status(400).json({ error:'name missing' })
      }
      const characteristicBD = await Characteristic.findById(body.characteristicID).populate('valuation')
      const valuation = characteristicBD.valuation
      //console.log(valuation)
      const evidenve = new Evidenve({
        characteristicID:body.characteristicID,
        subIndicatorID:body.subIndicatorID,
        name:body.name,
        link:body.link,
        note:body.note,
        content:body.content || [],
        state:true,
        verified:body.verified || false,
        qualification:body.qualification||1,
        author: new mongoose.Types.ObjectId(user),
        commits:[]
      })
      if(body.extras){
        evidenve.extras=body.extras
      }
      //console.log(req)
      const savedEvidence = await evidenve.save()//tenemos lal evidencia guardada
      await notify(1,user,3,savedEvidence.id,req)

      const updatedSubindicator = await updateSubindicator(savedEvidence,req)//actualizamos el subindidicador
      //const updatedSubindicator = await updateSubindicator(savedEvidence)//actualizamos el subindidicador
      //console.log('actualizao',updatedSubindicator)
      const savedAndFormattedevidenve = savedEvidence.toJSON()
      res.json(savedAndFormattedevidenve)
    }
  } catch (error) {
    next(error)
  }


})
//Calificar eviidencias
evidenveRouter.put('/qualify/:id',async(req,res,next) => {
  try {
    //Authorizaction
    const token = getTokenFrom(req)
    const decodedToken = jwt.verify(token,process.env.SECRET)
    if(!token||!decodedToken){
      return res.status(401).json({ error: 'token missing or invalid' })
    }else{
      const rolID = decodedToken.rol
      const user = decodedToken.id
      const rol = await Rol.findById(rolID)
      if(!rol){
        return res.status(401).json({ error: 'rol missing or invalid' })
      }else if(rol.name!==ROL_ADMIN){
        console.log('rol',rol.name)
        return res.status(401).json({ error: 'unauthorized rol' })
      }
      //end-authorization

      const body = req.body
      const id = req.params.id
      if(!id && !body.qualification){
        return res.status(400).json({ error:'missing id or qualification' })
      }
      //console.log('asdasd')
      let evidenveUpdating = {
        verified:body.verified|false,
        qualification:body.qualification,
        qualificationBy:user,
        qualificationDate:new Date(),
        commits:[]
      }
      let rubric
      const evidenceCurrent = await Evidenve.findById(id)
      if(evidenceCurrent.rubric.length===0){
        console.log('no hay rubrica')
        rubric = await Promise.all(body.rubric.map(async(r) => {
          const newRubric = new Rubric({
            valuation: new mongoose.Types.ObjectId(r.valuation),
            qualification: r.qualification,
            evidence:evidenceCurrent._id
          })
          const rSave = await newRubric.save()
          return rSave._id
        }))
      }else{
        console.log('si hay rubrica')
        const array =  body.rubric
        for (const i of array) {
          const rubricDB = await Rubric.findOne({ valuation: i.valuation, evidence: evidenceCurrent._id })
          //console.log('r', rubricDB)
          const updateRubric = await Rubric.findByIdAndUpdate(rubricDB._id, { qualification: i.qualification }, { new: true })
          //console.log('u', updateRubric)
        }

      }
      evidenceCurrent.rubric=rubric
      //console.log('asdasd')
      evidenceCurrent.qualification=body.qualification
      evidenceCurrent.qualificationBy=body.user
      evidenceCurrent.verified=body.verified|false
      evidenceCurrent.qualificationDate=new Date()
      if(body.commit){
        const comit = new Commit({
          autor:user,
          body:body.commit,
          created:new Date(),
          lastUpdate:new Date()
        })
        const commitSave = await comit.save()
        const arrayUpdate = evidenceCurrent.commits.concat(commitSave._id)
        console.log('comentarios actualizaos',arrayUpdate)
        evidenceCurrent.commits = arrayUpdate
        console.log('califcacion:',evidenceCurrent.qualification)
      }
      //console.log('evidencia',updateEvidenve)
      const updateEvidence = await Evidenve.findByIdAndUpdate(id,evidenceCurrent,{ new:true })
      await notify(2,user,3,updateEvidence.id,req)

      const indi = await updateSubindicator2(updateEvidence,req)
      if(indi){
        console.log('indicator updated')
      }
      const updateSub = await Subindicator.findByIdAndUpdate(updateEvidence.subIndicatorID,{ lastUpdate:new Date() },{ new:true })
      console.log(updateSub,'actualizado')
      return res.json(updateEvidence)
    }
  } catch (error) {
    next(error)
  }

})
evidenveRouter.put('/:id',(req,res,next) => {
  const body = req.body
  const id = req.params.id
  const evidenve = {
    name:body.name,
    characteristicID:body.characteristicID,
    subIndicatorID:body.subIndicatorID,
    link:body.link,
    verified:body.verified || false,
    note:body.note,
    commits:[]
  }
  Evidenve.findByIdAndUpdate(id,evidenve,{ new:true })
    .then(updateEvidenve => {
      res.json(updateEvidenve)
    })
    .catch(error => next(error))
})
module.exports = evidenveRouter
const autoQualificationIndicator = (indicator) => {
  const arraySubindicators = indicator.subindicators

  // Variables auxiliares para contar los subindicadores por calificación
  let count1 = 0
  let count2 = 0
  let count3 = 0

  // Iterar sobre los subindicadores y contar las calificaciones
  arraySubindicators.forEach((subindicator) => {
    if (subindicator.qualification === 1) {
      count1++
    } else if (subindicator.qualification === 2) {
      count2++
    } else if (subindicator.qualification === 3) {
      count3++
    }
  })

  // Calcular el número total de subindicadores evaluados
  const numberEvaluated = count1 + count2 + count3
  let qualification=0
  // Actualizar la calificación del indicador según las condiciones
  //si tengo un rojo todo esta en rojo
  if (count1 > 0) {
    indicator.qualification = 1
    qualification=1
    console.log('1')
  //si tengo un amarillo y numero de ealuador es mayor a la mitad de suubindicadores estas en amarillo
  } else if (count2 > 0 && numberEvaluated > arraySubindicators.length / 2) {
    indicator.qualification = 2
    qualification=2
    console.log('2')
  //si tengo todas en verde esta en verde el indicador
  } else if (count3 === arraySubindicators.length && count3>4) {
    indicator.qualification = 3
    qualification=3
    console.log('3')
  //si tengo mas de la mitad en verde estas en amarillo
  }else if (count3>arraySubindicators.length/2){
    indicator.qualification = 2
    qualification=2
    console.log('2')
  //si numero de evualos es mayor 0 estas en rojo
  } else if (numberEvaluated > 0) {
    indicator.qualification = 1
    qualification=1
    console.log('1')
    //console.log('check')
  //si no ningun subindicador evaluado estas en gris
  } else {
    indicator.qualification = 0
    qualification=0
  }
  console.log(qualification)
  return indicator
}
const autoQualifySubindicator = (subindcatorBD) => {
  const arrayCharacteristics = subindcatorBD.typeID.characteristics
  //red
  let existEvidence = []
  //yellow
  let existEvidenceCritic = []
  const arrayEvidences = subindcatorBD.evidences
  let qualifySubindicator = 0
  let scoreSubindicator = 0
  arrayCharacteristics.forEach(characteristic => {
    const total = characteristic.score
    scoreSubindicator+=total
    const founded = arrayEvidences.filter(evidence => evidence.characteristicID.equals(characteristic._id))
    //comprobar si existe evidencia para c/u caracteristica
    if(founded.length>0){
      existEvidence.push(true)
      let sum = 0
      founded.forEach(evidence => {
        sum+=evidence.qualification
      })
      const qualify = sum/total
      qualifySubindicator+=qualify
    }else{
      existEvidence.push(false)
    }
    //comprobar si falta evidencia para una caracteristica critica
    if((characteristic.tier>1 && founded.length===0) ){
      existEvidenceCritic.push(false)
    }else{
      //si la caracteristica no es critica o no hay evidencia
      existEvidenceCritic.push(true)
    }
  })
  console.log('score',scoreSubindicator)
  console.log('qualify',qualifySubindicator)
  subindcatorBD.score=qualifySubindicator
  subindcatorBD.totalScore=scoreSubindicator

  const count = existEvidence.reduce((acc,curr) => {
    if(curr){
      acc.trueCount++
    }else{
      acc.falseCount++
    }
    return acc
  },{ trueCount:0,falseCount:0 })
  const total = arrayCharacteristics.length
  const percent = count.trueCount/total
  //console.log(existEvidence)
  //Si existen todas las evidencias = verde
  if(!existEvidence.includes(false)){
    subindcatorBD.qualification=3
  //Si hay mas del 50% de evidencias = yellow
  }else if(count.trueCount>count.falseCount){
    subindcatorBD.qualification=2
    //Si falta una evidencia critica || hay mas del 10% de evidencias pero menos del 50% = rojo
  }else if(existEvidenceCritic.includes(false)|| (percent>0.1 && percent<=0.5)){
    subindcatorBD.qualification=1
  }else {
    subindcatorBD.qualification=0
  }
  return subindcatorBD
}
