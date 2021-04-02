import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import {config} from './init'
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
    const result=await basicallyGet(`${config.base}${path}`,params)
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
async function updateFirstPage(token:string,password:string){
    const result:{data:HoleData[]}|number=await getResult(`p1`,{
        update:'',
        key:'',
        token:token,
        password:password
    })
    if(result===401)return 401
    if(result===503)return 503
    if(result===404)return 404
    if(typeof result==='number')return 500
    return 200
}
async function rescue(period:number,token:string,password:string){
    while(true){
        const result=await updateFirstPage(token,password)
        if(result===401){
            log('401.')
            return
        }
        if(result===200){
            log('Rescurd.')
        }else{
            log(`${result}. Fail to rescue.`)
        }
        await sleep(period*60)
    }
}
export async function main(){
    Object.assign(config,JSON.parse(fs.readFileSync(path.join(__dirname,'../config.json'),{encoding:'utf8'})))
    const {token,password,period}=config
    await rescue(period,token,password)
}