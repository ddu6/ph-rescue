import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import {config} from './init'
import * as open from 'open'
let unlocking=false
interface Res{
    body:string
    buffer:Buffer
    cookie:string
    headers:http.IncomingHttpHeaders
    status:number
}
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
function getDate(){
    const date=new Date()
    return [date.getMonth()+1,date.getDate()].map(val=>val.toString().padStart(2,'0')).join('-')+' '+[date.getHours(),date.getMinutes(),date.getSeconds()].map(val=>val.toString().padStart(2,'0')).join(':')+':'+date.getMilliseconds().toString().padStart(3,'0')
}
function log(msg:string|Error){
    const dateStr=getDate()
    let string=dateStr+'  '
    if(typeof msg!=='string'){
        const {stack}=msg
        if(stack!==undefined){
            string+=stack
        }else{
            string+=msg.message
        }
    }else{
        string+=msg
    }
    string=string.replace(/\n */g,'\n                    ')
    const date=new Date()
    fs.appendFileSync(path.join(__dirname,`../info/log ${dateStr.split(' ')[0]}.txt`),string+'\n\n')
    return string
}
function out(msg:string|Error){
    const string=log(msg)
    console.log(string+'\n')
}
async function sleep(time:number){
    await new Promise(resolve=>{
        setTimeout(resolve,time*1000)
    })
}
async function basicallyGet(url:string,params:Record<string,string>={},cookie='',referer=''){
    let paramsStr=new URL(url).searchParams.toString()
    if(paramsStr.length>0)paramsStr+='&'
    paramsStr+=new URLSearchParams(params).toString()
    if(paramsStr.length>0)paramsStr='?'+paramsStr
    url=new URL(paramsStr,url).href
    const headers:http.OutgoingHttpHeaders={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36'
    }
    if(cookie.length>0)headers.Cookie=cookie
    if(referer.length>0)headers.Referer=referer
    const result=await new Promise((resolve:(val:number|Res)=>void)=>{
        setTimeout(()=>{
            resolve(500)
        },config.timeout*1000)
        const httpsOrHTTP=url.startsWith('https://')?https:http
        httpsOrHTTP.get(url,{
            headers:headers
        },async res=>{
            const {statusCode}=res
            if(statusCode===undefined){
                resolve(500)
                return
            }
            if(statusCode>=400){
                resolve(statusCode)
                return
            }
            let cookie:string
            const cookie0=res.headers["set-cookie"]
            if(cookie0===undefined){
                cookie=''
            }else{
                cookie=cookie0.map(val=>val.split(';')[0]).join('; ')
            }
            let body=''
            const buffers:Buffer[]=[]
            res.on('data',chunk=>{
                if(typeof chunk==='string'){
                    body+=chunk
                }else if(chunk instanceof Buffer){
                    body+=chunk
                    buffers.push(chunk)
                }
            })
            res.on('end',()=>{
                resolve({
                    body:body,
                    buffer:Buffer.concat(buffers),
                    cookie:cookie,
                    headers:res.headers,
                    status:statusCode
                })
            })
            res.on('error',err=>{
                log(err)
                resolve(500)
            })
        }).on('error',err=>{
            log(err)
            resolve(500)
        })
    })
    return result
}
async function getResult(path:string,params:Record<string,string>={}){
    const result=await basicallyGet(`${config.base}${path}`,params)
    if(typeof result==='number')return result
    const {status,body}=result
    if(status!==200)return status
    try{
        const {status,data}=JSON.parse(body)
        if(status===200)return {data:data}
        if(typeof status==='number')return status
    }catch(err){
        log(err)
    }
    return 500
}
async function basicallyGetComments(id:number|string,token:string,password:string){
    const data:{data:CommentData[]}|number=await getResult(`cs${id}`,{
        update:'',
        token:token,
        password:password
    })
    return data
}
async function basicallyGetLocalComments(id:number|string,token:string,password:string){
    const data:{data:CommentData[]}|number=await getResult(`local/cs${id}`,{
        token:token,
        password:password
    })
    return data
}
async function basicallyGetHole(id:number|string,token:string,password:string){
    const data:{data:HoleData}|number=await getResult(`h${id}`,{
        update:'',
        token:token,
        password:password
    })
    return data
}
async function basicallyGetPage(p:number|string,key:string,token:string,password:string){
    const data:{data:HoleData[]}|number=await getResult(`p${p}`,{
        update:'',
        key:key,
        token:token,
        password:password
    })
    return data
}
async function basicallyGetLocalPage(p:number|string,key:string,s:string,e:string,token:string,password:string){
    const data:{data:HoleData[]}|number=await getResult(`local/p${p}`,{
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
            log('503.')
            await sleep(config.congestionSleep)
            continue
        }
        if(result===500){
            log('500.')
            await sleep(config.errSleep)
            continue
        }
        if(result===401)return 401
        if(result===403)return 403
        if(typeof result==='number')return 500
        return result
    }
    return 500
}
async function getLocalPages(key:string,s:string,e:string,token:string,password:string){
    const data:HoleData[]=[]
    for(let p=1;;p++){
        const result=await getLocalPage(p,key,s,e,token,password)
        if(result===401)return 401
        if(result===403)return 403
        if(result===500)return 500
        data.push(...result.data)
        if(result.data.length<50)break
    }
    return data
}
async function basicallyUpdateComments(id:number|string,reply:number,token:string,password:string){
    if(reply===0)return 200
    if(reply>0){
        const result0=await basicallyGetLocalComments(id,token,password)
        if(result0===401)return 401
        if(result0===403)return 403
        if(result0===503)return 503
        if(typeof result0==='number')return 500
        const data0=result0.data
        const length0=data0.length
        if(length0>=reply)return 200
    }
    const result1=await basicallyGetComments(id,token,password)
    if(result1===423)return 423
    if(result1===401)return 401
    if(result1===403)return 403
    if(result1===503)return 503
    if(result1===404)return 404
    if(typeof result1==='number')return 500
    const data1=result1.data
    for(let i=0;i<data1.length;i++){
        const {text}=data1[i]
        if(typeof text==='string'&&text.startsWith('[Helper]'))return 423
    }
    if(data1.length>0){
        const cid=Math.max(...data1.map(val=>Number(val.cid)))
        const timestamp=Math.max(...data1.map(val=>Number(val.timestamp)))
        log(`cs${id} updated to c${cid} which is in ${prettyDate(timestamp)}.`)
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
            log('503.')
            await sleep(config.congestionSleep)
            continue
        }
        if(result===500){
            log('500.')
            await sleep(config.errSleep)
            continue
        }
        if(result===423){
            log('423.')
            if(config.autoUnlock){
                await unlock()
            }
            await sleep(config.recaptchaSleep)
            continue
        }
        if(result===401)return 401
        if(result===403)return 403
        return 200
    }
    return 500
}
async function basicallyUpdateHole(localData:HoleData,token:string,password:string){
    if(Number(localData.timestamp)===0)return 404
    if(Number(localData.hidden)===1)return 404
    const result1=await basicallyGetHole(localData.pid,token,password)
    if(result1===401)return 401
    if(result1===403)return 403
    if(result1===503)return 503
    if(result1===404)return 404
    if(typeof result1==='number')return 500
    const data1=result1.data
    const reply=Number(data1.reply)
    const deltaComments=reply-Number(localData.reply)
    const deltaLikes=Number(data1.likenum)-Number(localData.likenum)
    if(
        deltaComments>0
        ||deltaLikes!==0
    ){
        log(`h${localData.pid} updated by ${deltaComments} comments and ${deltaLikes} likes.`)
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
            out('503.')
            await sleep(config.congestionSleep)
            continue
        }
        if(result===500){
            out('500.')
            await sleep(config.errSleep)
            continue
        }
        if(result===401)return 401
        if(result===403)return 403
        return 200
    }
    return 500
}
async function basicallyUpdatePage(p:number|string,key:string,token:string,password:string){
    const result=await basicallyGetPage(p,key,token,password)
    if(result===401)return 401
    if(result===403)return 403
    if(result===503)return 503
    if(typeof result==='number')return 500
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
            log('503.')
            await sleep(config.congestionSleep)
            continue
        }
        if(result===500){
            log('500.')
            await sleep(config.errSleep)
            continue
        }
        if(result===401)return 401
        if(result===403)return 403
        return result
    }
    return 500
}
async function updatePages(lastMaxTime:number,span:number,token:string,password:string){
    let maxTime=lastMaxTime
    let minTime=lastMaxTime
    for(let p=1;p<=100&&minTime+60*span>=lastMaxTime;p++){
        const result=await updatePage(p,'',token,password)
        if(result===401)return 401
        if(result===403)return 403
        if(result===500)return 500
        if(p===1){
            maxTime=result.maxTime
        }
        minTime=result.minTime
    }
    return {maxTime}
}
async function rescueHoles(token:string,password:string){
    let maxTime=Math.floor(Date.now()/1000)-config.restartingBound
    while(true){
        const result=await updatePages(maxTime,0,token,password)
        if(result===401){
            out('401.')
            return
        }
        if(result===403){
            out('403.')
            return
        }
        if(result===500){
            out(`Fail to rescue holes after ${prettyDate(maxTime)}.`)
        }else{
            log(`Rescue holes after ${prettyDate(maxTime)}.`)
            maxTime=result.maxTime
        }
        await sleep(config.rescuingHolesInterval)
    }
}
async function rescueComments(token:string,password:string){
    const interval=config.rescuingCommentsInterval
    const spans=config.rescuingCommentsSpans
    const strictSpans=config.updatingHolesSpans
    let now=Math.floor(Date.now()/1000)
    let last=now-interval-config.restartingBound
    while(true){
        now=Math.floor(Date.now()/1000)
        let failed=false
        for(let i=0;i<spans.length;i++){
            const span=spans[i]
            const e=now-span
            const s=last-span
            const result=await getLocalPages('',s.toString(),e.toString(),token,password)
            if(result===401){
                out('401.')
                return
            }
            if(result===403){
                out('403.')
                return
            }
            if(result===500){
                failed=true
                out(`Fail to rescue comments between ${prettyDate(s)} and ${prettyDate(e)}.`)
                break
            }
            const strict=strictSpans.includes(span)
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
                    out('401.')
                    return
                }
                if(result1===403){
                    out('403.')
                    return
                }
                if(result1===500){
                    failed=true
                    out(`Fail to rescue comments between ${prettyDate(s)} and ${prettyDate(e)}.`)
                    break
                }
            }
            if(failed)break
            log(`Rescue comments between ${prettyDate(s)} and ${prettyDate(e)} under span ${span}.`)
        }
        if(!failed){
            last=now
        }
        await sleep(interval)
    }
}
async function unlock(){
    if(unlocking)return
    unlocking=true
    const cp=await open('https://pkuhelper.pku.edu.cn/hole')
    await sleep(config.unlockingSleep)
    cp.kill()
    unlocking=false
}
function prettyDate(stamp:string|number){
    const date=new Date(Number(stamp)*1000)
    const now=new Date()
    const year=date.getFullYear()
    const nowYear=now.getFullYear()
    const md=(date.getMonth()+1)+'/'+
    date.getDate()
    const nowMD=(now.getMonth()+1)+'/'+
    now.getDate()
    const hms=date.getHours()+':'+
    date.getMinutes()+':'+
    date.getSeconds()
    if(year!==nowYear)return hms+' '+year+'/'+md
    if(nowMD!==md)return hms+' '+md
    return hms
}
export async function main(){
    Object.assign(config,JSON.parse(fs.readFileSync(path.join(__dirname,'../config.json'),{encoding:'utf8'})))
    const {token,password}=config
    const promises:Promise<void>[]=[]
    promises.push(rescueHoles(token,password),rescueComments(token,password))
    await Promise.all(promises)
}