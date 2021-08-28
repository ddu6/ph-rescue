import {config} from './init'
import {chromium} from 'playwright-chromium'
import {CLIT} from '@ddu6/cli-tools'
const clit=new CLIT(__dirname,config)
let unlocking=false
interface HoleData{
    text:string|null|undefined
    tag:string|null|undefined
    pid:number|string
    timestamp:number|string
    reply:number|string
    likenum:number|string
    type:string|null|undefined
    url:string|null|undefined
    hidden:'1'|'0'|1|0|boolean
    etimestamp:number|string|undefined
}
interface CommentData{
    text:string|null|undefined
    tag:string|null|undefined
    cid:number|string
    pid:number|string
    timestamp:number|string
    name:string|null|undefined
}
async function sleep(time:number){
    await new Promise(resolve=>{
        setTimeout(resolve,time*1000)
    })
}
async function get(path:string,params:Record<string,string>={}){
    const result=await clit.request(`https://${config.domain}/phs/${path}`,params)
    if(typeof result==='number'){
        return result
    }
    const {status,body}=result
    if(status!==200){
        return status
    }
    try{
        const {status,data}=JSON.parse(body)
        if(status===200){
            return {data:data}
        }
        if(typeof status==='number'){
            return status
        }
    }catch(err){
        clit.log(err)
    }
    return 500
}
async function basicallyGetComments(id:number|string,token:string,password:string){
    const data:{data:CommentData[]}|number=await get(`cs${id}`,{
        update:'',
        token:token,
        password:password
    })
    return data
}
async function basicallyGetLocalComments(id:number|string,token:string,password:string){
    const data:{data:CommentData[]}|number=await get(`local/cs${id}`,{
        token:token,
        password:password
    })
    return data
}
async function basicallyGetHole(id:number|string,token:string,password:string){
    const data:{data:HoleData}|number=await get(`h${id}`,{
        update:'',
        token:token,
        password:password
    })
    return data
}
async function basicallyGetPage(p:number|string,key:string,token:string,password:string){
    const data:{data:HoleData[]}|number=await get(`p${p}`,{
        update:'',
        key:key,
        token:token,
        password:password
    })
    return data
}
async function basicallyGetLocalPage(p:number|string,key:string,s:string,e:string,token:string,password:string){
    const data:{data:HoleData[]}|number=await get(`local/p${p}`,{
        key,
        s,
        e,
        token,
        password,
    })
    return data
}
async function getLocalPage(p:number|string,key:string,s:string,e:string,token:string,password:string){
    for(let i=0;i<config.failureLimit;i++){
        if(unlocking){
            await sleep(config.recaptchaSleep)
            continue
        }
        const result=await basicallyGetLocalPage(p,key,s,e,token,password)
        if(result===503){
            clit.log('503')
            await sleep(config.congestionSleep)
            continue
        }
        if(result===500){
            clit.log('500')
            await sleep(config.errSleep)
            continue
        }
        if(result===401){
            return 401
        }
        if(result===403){
            return 403
        }
        if(typeof result==='number'){
            return 500
        }
        return result
    }
    return 500
}
async function getLocalPages(key:string,s:string,e:string,token:string,password:string){
    const data:HoleData[]=[]
    for(let p=1;;p++){
        const result=await getLocalPage(p,key,s,e,token,password)
        if(result===401){
            return 401
        }
        if(result===403){
            return 403
        }
        if(result===500){
            return 500
        }
        data.push(...result.data)
        if(result.data.length<50){
            break
        }
    }
    return data
}
async function basicallyUpdateComments(id:number|string,reply:number,token:string,password:string){
    if(reply===0){
        return 200
    }
    if(reply>0){
        const result0=await basicallyGetLocalComments(id,token,password)
        if(result0===401){
            return 401
        }
        if(result0===403){
            return 403
        }
        if(result0===503){
            return 503
        }
        if(typeof result0==='number'){
            return 500
        }
        const data0=result0.data
        const length0=data0.length
        if(length0>=reply){
            return 200
        }
    }
    const result1=await basicallyGetComments(id,token,password)
    if(result1===423){
        return 423
    }
    if(result1===401){
        return 401
    }
    if(result1===403){
        return 403
    }
    if(result1===503){
        return 503
    }
    if(result1===404){
        return 404
    }
    if(typeof result1==='number'){
        return 500
    }
    const data1=result1.data
    for(let i=0;i<data1.length;i++){
        const {text}=data1[i]
        if(typeof text==='string'&&text.startsWith('[Helper]')){
            return 423
        }
    }
    if(data1.length>0){
        const cid=Math.max(...data1.map(val=>Number(val.cid)))
        const timestamp=Math.max(...data1.map(val=>Number(val.timestamp)))
        clit.log(`cs${id} updated to c${cid} which is in ${prettyTimestamp(timestamp)}`)
    }
    return 200
}
async function updateComments(id:number|string,reply:number,token:string,password:string){
    for(let i=0;i<config.failureLimit;i++){
        if(unlocking){
            await sleep(config.recaptchaSleep)
            continue
        }
        const result=await basicallyUpdateComments(id,reply,token,password)
        if(result===503){
            clit.log('503')
            await sleep(config.congestionSleep)
            continue
        }
        if(result===500){
            clit.log('500')
            await sleep(config.errSleep)
            continue
        }
        if(result===423){
            clit.log('423')
            if(config.autoUnlock){
                await unlock()
            }
            await sleep(config.recaptchaSleep)
            continue
        }
        if(result===401){
            return 401
        }
        if(result===403){
            return 403
        }
        return 200
    }
    return 500
}
async function basicallyUpdateHole(localData:HoleData,token:string,password:string){
    if(Number(localData.timestamp)===0){
        return 404
    }
    if(Number(localData.hidden)===1){
        return 404
    }
    const result1=await basicallyGetHole(localData.pid,token,password)
    if(result1===401){
        return 401
    }
    if(result1===403){
        return 403
    }
    if(result1===503){
        return 503
    }
    if(result1===404){
        return 404
    }
    if(typeof result1==='number'){
        return 500
    }
    const data1=result1.data
    const reply=Number(data1.reply)
    const deltaComments=reply-Number(localData.reply)
    const deltaLikes=Number(data1.likenum)-Number(localData.likenum)
    if(
        deltaComments>0
        ||deltaLikes!==0
    ){
        clit.log(`h${localData.pid} updated by ${deltaComments} comments and ${deltaLikes} likes`)
    }
    return await updateComments(localData.pid,reply,token,password)
}
async function updateHole(localData:HoleData,token:string,password:string){
    for(let i=0;i<config.failureLimit;i++){
        if(unlocking){
            await sleep(config.recaptchaSleep)
            continue
        }
        const result=await basicallyUpdateHole(localData,token,password)
        if(result===503){
            clit.out('503')
            await sleep(config.congestionSleep)
            continue
        }
        if(result===500){
            clit.out('500')
            await sleep(config.errSleep)
            continue
        }
        if(result===401){
            return 401
        }
        if(result===403){
            return 403
        }
        return 200
    }
    return 500
}
async function basicallyUpdatePage(p:number|string,key:string,token:string,password:string){
    const result=await basicallyGetPage(p,key,token,password)
    if(result===401){
        return 401
    }
    if(result===403){
        return 403
    }
    if(result===503){
        return 503
    }
    if(typeof result==='number'){
        return 500
    }
    const data=result.data
    return {
        maxTime:Number(data[0].timestamp),
        minTime:Number(data[data.length-1].timestamp)
    }
}
async function updatePage(p:number,key:string,token:string,password:string){
    for(let i=0;i<config.failureLimit;i++){
        if(unlocking){
            await sleep(config.recaptchaSleep)
            continue
        }
        const result=await basicallyUpdatePage(p,key,token,password)
        if(result===503){
            clit.log('503')
            await sleep(config.congestionSleep)
            continue
        }
        if(result===500){
            clit.log('500')
            await sleep(config.errSleep)
            continue
        }
        if(result===401){
            return 401
        }
        if(result===403){
            return 403
        }
        return result
    }
    return 500
}
async function updatePages(lastMaxTime:number,span:number,token:string,password:string){
    let maxTime=lastMaxTime
    let minTime=lastMaxTime
    for(let p=1;p<=100&&minTime+span>=lastMaxTime;p++){
        const result=await updatePage(p,'',token,password)
        if(result===401){
            return 401
        }
        if(result===403){
            return 403
        }
        if(result===500){
            return 500
        }
        if(p===1){
            maxTime=result.maxTime
        }
        minTime=result.minTime
    }
    return {maxTime}
}
async function rescueHoles(token:string,password:string){
    let maxTime=Math.floor(Date.now()/1000)-config.restartDuration
    while(true){
        const result=await updatePages(maxTime,0,token,password)
        if(result===401){
            clit.out('401')
            return
        }
        if(result===403){
            clit.out('403')
            return
        }
        if(result===500){
            clit.out(`Fail to rescue holes after ${prettyTimestamp(maxTime)}`)
        }else{
            clit.log(`Rescue holes after ${prettyTimestamp(maxTime)}`)
            maxTime=result.maxTime
        }
        await sleep(config.rescueHolesInterval)
    }
}
async function rescueComments(token:string,password:string){
    let last=Math.floor(Date.now()/1000)-config.rescueCommentsInterval-config.restartDuration
    while(true){
        const now=Math.floor(Date.now()/1000)
        normal:{
            for(let i=0;i<config.rescueCommentsSpans.length;i++){
                const span=config.rescueCommentsSpans[i]
                const e=now-span
                const s=last-span
                const result=await getLocalPages('',s.toString(),e.toString(),token,password)
                if(result===401){
                    clit.out('401')
                    return
                }
                if(result===403){
                    clit.out('403')
                    return
                }
                if(result===500){
                    clit.out(`Fail to rescue comments between ${prettyTimestamp(s)} and ${prettyTimestamp(e)}`)
                    break normal
                }
                const strict=config.updateHolesSpans.includes(span)
                for(let i=0;i<result.length;i++){
                    const item=result[i]
                    const id=Number(item.pid)
                    let result1:200|401|403|500
                    if(strict){
                        result1=await updateHole(item,token,password)
                    }else{
                        result1=await updateComments(id,-1,token,password)
                    }
                    if(result1===401){
                        clit.out('401')
                        return
                    }
                    if(result1===403){
                        clit.out('403')
                        return
                    }
                    if(result1===500){
                        clit.out(`Fail to rescue comments between ${prettyTimestamp(s)} and ${prettyTimestamp(e)}`)
                        break normal
                    }
                }
                clit.log(`Rescue comments between ${prettyTimestamp(s)} and ${prettyTimestamp(e)} under span ${span}`)
            }
            last=now
        }
        await sleep(config.rescueCommentsInterval)
    }
}
async function unlock(){
    if(unlocking){
        return
    }
    unlocking=true
    const browser=await chromium.launch()
    const context=await browser.newContext({storageState:{origins:[{
        origin:'https://pkuhelper.pku.edu.cn',
        localStorage:[{
            name:'TOKEN',
            value:config.token
        }]
    }]}})
    const page=await context.newPage()
    try{
        await page.goto('https://pkuhelper.pku.edu.cn/hole',{timeout:config.unlockSleep*1000})
    }catch(err){
        clit.log(err)
    }
    await sleep(config.unlockSleep)
    await browser.close()
    unlocking=false
}
function prettyTimestamp(stamp:string|number){
    const date=new Date(Number(stamp+'000'))
    return [
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
    ]
    .map(val=>val.toString().padStart(2,'0'))
    .join(':')
    +' '
    +[
        date.getMonth()+1,
        date.getDate(),
        date.getFullYear(),
    ]
    .map(val=>val.toString().padStart(2,'0'))
    .join('/')
}
export async function main(){
    const {token,password}=config
    const promises:Promise<void>[]=[]
    promises.push(rescueHoles(token,password),rescueComments(token,password))
    await Promise.all(promises)
}