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
    base:"https://ddu6.xyz/services/ph-get/",
    threads:5,
    congestionSleep:0.5,
    errSleep:1,
    recaptchaSleep:10,
    timeout:5,
    interval:1,
    period:10,
    depth:1,
    autoUnlock:false,
    unlockingSleep:10
}
const path0=path.join(__dirname,'../config.json')
if(!fs.existsSync(path0))fs.writeFileSync(path0,JSON.stringify(config,null,4))