import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'fs'
import {join} from 'path'
[
    '../info/'
].map(val=>join(__dirname,val)).forEach(val=>{
    if(!existsSync(val)){
        mkdirSync(val)
    }
})
export const config={
    domain:"example.com",
    token:"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    password:"xxxxxxxx",
    autoUnlock:true,
    rescueHolesInterval:10,
    rescueCommentsInterval:60,
    restartDuration:60,
    rescueCommentsSpans:[
        600,
        3600,
        86400,
    ],
    updateHolesSpans:[
        3600,
        86400,
    ],
    failureLimit:10,
    congestionSleep:0.5,
    stepSleep:1,
    errSleep:1,
    recaptchaSleep:10,
    unlockSleep:10,
    requestTimeout:10,
}
const path=join(__dirname,'../config.json')
if(!existsSync(path)){
    writeFileSync(path,JSON.stringify(config,undefined,4))
}else{
    Object.assign(config,JSON.parse(readFileSync(path,{encoding:'utf8'})))
}