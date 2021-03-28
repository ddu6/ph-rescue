import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
let domain='ddu6.xyz'
let threads=2
let congestionSleep=3
let errSleep=5
let recaptchaSleep=60
let timeout=10
let interval=1
let period=60
let depth=10
interface Res{
    body:string
    buffer:Buffer
    cookie:string
    headers:http.IncomingHttpHeaders
    status:number
}
interface Config{
    token:string
    password:string
    domain:string
    threads:number
    congestionSleep:number
    errSleep:number
    recaptchaSleep:number
    timeout:number
    interval:number
    period:number
    depth:number
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
function semilog(msg:string|Error){
    let string=getDate()+'  '
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
    fs.appendFileSync(path.join(__dirname,'../info/semilog.txt'),string+'\n\n')
    return string
}
function log(msg:string|Error){
    const string=semilog(msg)
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
        },timeout*1000)
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
                semilog(err)
                resolve(500)
            })
        }).on('error',err=>{
            semilog(err)
            resolve(500)
        })
    })
    return result
}
async function getResult(path:string,params:Record<string,string>={}){
    const result=await basicallyGet(`https://${domain}/services/ph-get/${path}`,params)
    if(typeof result==='number')return result
    const {status,body}=result
    if(status!==200)return status
    try{
        const {status,data}=JSON.parse(body)
        if(status===200)return {data:data}
        if(typeof status==='number')return status
    }catch(err){
        semilog(err)
    }
    return 500
}
async function basicallyGetComments(id:number|string,token:string,password:string){
    const data:{data:CommentData[]}|number=await getResult(`c${id}`,{
        update:'',
        token:token,
        password:password
    })
    return data
}
async function basicallyGetLocalComments(id:number|string,token:string,password:string){
    const data:{data:CommentData[]}|number=await getResult(`local/c${id}`,{
        token:token,
        password:password
    })
    return data
}
async function basicallyGetPage(key:string,page:number|string,token:string,password:string){
    const data:{data:HoleData[]}|number=await getResult(`p${page}`,{
        update:'',
        key:key,
        token:token,
        password:password
    })
    return data
}
async function basicallyUpdateComments(id:number|string,reply:number,token:string,password:string){
    if(reply===0)return 200
    const result0=await basicallyGetLocalComments(id,token,password)
    if(result0===401)return 401
    if(result0===503)return 503
    if(typeof result0==='number')return 500
    const data0=result0.data
    const length0=data0.length
    if(reply>=0&&length0>=reply)return 200
    const result1=await basicallyGetComments(id,token,password)
    if(result1===401)return 401
    if(result1===503)return 503
    if(result1===404)return 404
    if(typeof result1==='number')return 500
    const data1=result1.data
    for(let i=0;i<data1.length;i++){
        const {text}=data1[i]
        if(typeof text==='string'&&text.startsWith('[Helper]'))return 423
    }
    semilog(`c${id} updated.`)
    return 200
}
async function updateComments(id:number|string,reply:number,token:string,password:string){
    const timeLimit=Date.now()+period*60000
    while(true){
        if(Date.now()>timeLimit)return 500
        const result=await basicallyUpdateComments(id,reply,token,password)
        if(result===503){
            semilog('503.')
            await sleep(congestionSleep)
            continue
        }
        if(result===500){
            semilog('500.')
            await sleep(errSleep)
            continue
        }
        if(result===423){
            semilog('423.')
            await sleep(recaptchaSleep)
            continue
        }
        if(result===401)return 401
        return 200
    }
}
async function basicallyUpdatePage(key:string,page:number|string,token:string,password:string){
    const result=await basicallyGetPage(key,page,token,password)
    if(result===401)return 401
    if(result===503)return 503
    if(result===404)return 404
    if(typeof result==='number')return 500
    const data=result.data
    let promises:Promise<200|401|500>[]=[]
    let subIds:(number|string)[]=[]
    for(let i=0;i<data.length;i++){
        const {pid,reply}=data[i]
        promises.push(updateComments(pid,Number(reply),token,password))
        subIds.push(pid)
        if(promises.length<threads&&i<data.length-1)continue
        const result=await Promise.all(promises)
        if(result.includes(401))return 401
        if(result.includes(500))return 500
        semilog(`#${subIds.join(',')} toured.`)
        promises=[]
        subIds=[]
        await sleep(interval)
    }
    return 200
}
async function updatePage(key:string,page:number,token:string,password:string){
    const timeLimit=Date.now()+period*60000
    while(true){
        if(Date.now()>timeLimit)return 500
        const result=await basicallyUpdatePage(key,page,token,password)
        if(result===503){
            semilog('503.')
            await sleep(congestionSleep)
            continue
        }
        if(result===500){
            semilog('500.')
            await sleep(errSleep)
            continue
        }
        if(result===401)return 401
        return 200
    }
}
async function updatePages(key:string,pages:number[],token:string,password:string){
    for(let i=0;i<pages.length;i++){
        const page=pages[i]
        const result=await updatePage(key,page,token,password)
        if(result===401)return 401
        if(result===500)return 500
        semilog(`p${page} toured.`)
    }
    return 200
}
async function rescue(period:number,depth:number,token:string,password:string){
    while(true){
        const result=await updatePages('',Array.from({length:depth},(v,i)=>i+1),token,password)
        if(result===401){
            log('401.')
            return
        }
        if(result===500){
            log('Fail to rescue.')
        }else{
            log('Rescurd.')
        }
        await sleep(period*60)
    }
}
export async function main(){
    const config:Config=JSON.parse(fs.readFileSync(path.join(__dirname,'../config.json'),{encoding:'utf8'}))
    const {token,password}=config
    domain=config.domain
    threads=config.threads
    congestionSleep=config.congestionSleep
    errSleep=config.errSleep
    recaptchaSleep=config.recaptchaSleep
    timeout=config.timeout
    interval=config.interval
    period=config.period
    depth=config.depth
    await rescue(period,depth,token,password)
}