import * as fs from 'fs'
import * as path from 'path'
[
    '../info/'
].map(val=>path.join(__dirname,val)).forEach(val=>{
    if(!fs.existsSync(val))fs.mkdirSync(val)
})
export const config={
    token:"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    password:"xxxxxxxx",
    autoUnlock:false,
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
    timeout:5,
    base:"https://ddu6.xyz/services/ph-get/",
}
const path0=path.join(__dirname,'../config.json')
if(!fs.existsSync(path0))fs.writeFileSync(path0,JSON.stringify(config,null,4))