import * as fs from 'fs'
import * as path from 'path'
[
    '../info/'
].map(val=>path.join(__dirname,val)).forEach(val=>{
    if(!fs.existsSync(val))fs.mkdirSync(val)
})
export const config={
    domain:"example.com",
    token:"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    password:"xxxxxxxx",
    autoUnlock:true,
    rescuingHolesInterval:10,
    rescuingCommentsInterval:60,
    restartingDuration:60,
    rescuingCommentsSpans:[
        600,
        1800,
        3600,
        43200,
        604800,
    ],
    updatingHolesSpans:[
        3600,
        604800,
    ],
    failureLimit:10,
    congestionSleep:0.5,
    stepSleep:1,
    errSleep:1,
    recaptchaSleep:10,
    unlockingSleep:10,
    requestTimeout:10,
}
const path0=path.join(__dirname,'../config.json')
if(!fs.existsSync(path0)){
    fs.writeFileSync(path0,JSON.stringify(config,undefined,4))
}else{
    Object.assign(config,JSON.parse(fs.readFileSync(path0,{encoding:'utf8'})))
}