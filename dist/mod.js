"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const init_1 = require("./init");
const open = require("open");
let unlocking = false;
function getDate() {
    const date = new Date();
    return [date.getMonth() + 1, date.getDate()].map(val => val.toString().padStart(2, '0')).join('-') + ' ' + [date.getHours(), date.getMinutes(), date.getSeconds()].map(val => val.toString().padStart(2, '0')).join(':') + ':' + date.getMilliseconds().toString().padStart(3, '0');
}
function log(msg) {
    let string = getDate() + '  ';
    if (typeof msg !== 'string') {
        const { stack } = msg;
        if (stack !== undefined) {
            string += stack;
        }
        else {
            string += msg.message;
        }
    }
    else {
        string += msg;
    }
    string = string.replace(/\n */g, '\n                    ');
    fs.appendFileSync(path.join(__dirname, '../info/log.txt'), string + '\n\n');
    return string;
}
function out(msg) {
    const string = log(msg);
    console.log(string + '\n');
}
async function sleep(time) {
    await new Promise(resolve => {
        setTimeout(resolve, time * 1000);
    });
}
async function basicallyGet(url, params = {}, cookie = '', referer = '') {
    let paramsStr = new URL(url).searchParams.toString();
    if (paramsStr.length > 0)
        paramsStr += '&';
    paramsStr += new URLSearchParams(params).toString();
    if (paramsStr.length > 0)
        paramsStr = '?' + paramsStr;
    url = new URL(paramsStr, url).href;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36'
    };
    if (cookie.length > 0)
        headers.Cookie = cookie;
    if (referer.length > 0)
        headers.Referer = referer;
    const result = await new Promise((resolve) => {
        setTimeout(() => {
            resolve(500);
        }, init_1.config.timeout * 1000);
        const httpsOrHTTP = url.startsWith('https://') ? https : http;
        httpsOrHTTP.get(url, {
            headers: headers
        }, async (res) => {
            const { statusCode } = res;
            if (statusCode === undefined) {
                resolve(500);
                return;
            }
            if (statusCode >= 400) {
                resolve(statusCode);
                return;
            }
            let cookie;
            const cookie0 = res.headers["set-cookie"];
            if (cookie0 === undefined) {
                cookie = '';
            }
            else {
                cookie = cookie0.map(val => val.split(';')[0]).join('; ');
            }
            let body = '';
            const buffers = [];
            res.on('data', chunk => {
                if (typeof chunk === 'string') {
                    body += chunk;
                }
                else if (chunk instanceof Buffer) {
                    body += chunk;
                    buffers.push(chunk);
                }
            });
            res.on('end', () => {
                resolve({
                    body: body,
                    buffer: Buffer.concat(buffers),
                    cookie: cookie,
                    headers: res.headers,
                    status: statusCode
                });
            });
            res.on('error', err => {
                log(err);
                resolve(500);
            });
        }).on('error', err => {
            log(err);
            resolve(500);
        });
    });
    return result;
}
async function getResult(path, params = {}) {
    const result = await basicallyGet(`${init_1.config.base}${path}`, params);
    if (typeof result === 'number')
        return result;
    const { status, body } = result;
    if (status !== 200)
        return status;
    try {
        const { status, data } = JSON.parse(body);
        if (status === 200)
            return { data: data };
        if (typeof status === 'number')
            return status;
    }
    catch (err) {
        log(err);
    }
    return 500;
}
async function basicallyGetComments(id, token, password) {
    const data = await getResult(`cs${id}`, {
        update: '',
        token: token,
        password: password
    });
    return data;
}
async function basicallyGetLocalComments(id, token, password) {
    const data = await getResult(`local/cs${id}`, {
        token: token,
        password: password
    });
    return data;
}
async function basicallyGetPage(key, page, token, password) {
    const data = await getResult(`p${page}`, {
        update: '',
        key: key,
        token: token,
        password: password
    });
    return data;
}
async function basicallyUpdateComments(id, reply, token, password) {
    if (reply === 0)
        return 200;
    const result0 = await basicallyGetLocalComments(id, token, password);
    if (result0 === 401)
        return 401;
    if (result0 === 403)
        return 403;
    if (result0 === 503)
        return 503;
    if (typeof result0 === 'number')
        return 500;
    const data0 = result0.data;
    const length0 = data0.length;
    if (reply >= 0 && length0 >= reply)
        return 200;
    const result1 = await basicallyGetComments(id, token, password);
    if (result1 === 423)
        return 423;
    if (result1 === 401)
        return 401;
    if (result1 === 403)
        return 403;
    if (result1 === 503)
        return 503;
    if (result1 === 404)
        return 404;
    if (typeof result1 === 'number')
        return 500;
    const data1 = result1.data;
    for (let i = 0; i < data1.length; i++) {
        const { text } = data1[i];
        if (typeof text === 'string' && text.startsWith('[Helper]'))
            return 423;
    }
    const cid = Math.max(...data1.map(val => Number(val.cid)));
    const timestamp = Math.max(...data1.map(val => Number(val.timestamp)));
    log(`cs${id} updated to c${cid} which is in ${prettyDate(timestamp)}.`);
    return 200;
}
async function updateComments(id, reply, token, password) {
    for (let i = 0; i < 10; i++) {
        if (unlocking) {
            await sleep(init_1.config.recaptchaSleep);
            continue;
        }
        const result = await basicallyUpdateComments(id, reply, token, password);
        if (result === 503) {
            log('503.');
            await sleep(init_1.config.congestionSleep);
            continue;
        }
        if (result === 500) {
            log('500.');
            await sleep(init_1.config.errSleep);
            continue;
        }
        if (result === 423) {
            log('423.');
            if (init_1.config.autoUnlock) {
                await unlock();
            }
            await sleep(init_1.config.recaptchaSleep);
            continue;
        }
        if (result === 401)
            return 401;
        if (result === 403)
            return 403;
        return 200;
    }
    return 500;
}
async function basicallyUpdatePage(key, page, token, password) {
    const result = await basicallyGetPage(key, page, token, password);
    if (result === 401)
        return 401;
    if (result === 403)
        return 403;
    if (result === 503)
        return 503;
    if (typeof result === 'number')
        return 500;
    const data = result.data;
    let promises = [];
    let subIds = [];
    for (let i = 0; i < data.length; i++) {
        const { pid, reply } = data[i];
        promises.push(updateComments(pid, Number(reply), token, password));
        subIds.push(pid);
        if (promises.length < init_1.config.threads && i < data.length - 1)
            continue;
        const result = await Promise.all(promises);
        if (result.includes(401))
            return 401;
        if (result.includes(403))
            return 403;
        if (result.includes(500))
            return 500;
        log(`#${subIds.join(',')} toured.`);
        promises = [];
        subIds = [];
        await sleep(init_1.config.stepSleep);
    }
    return {
        maxTime: Number(data[0].timestamp),
        minTime: Number(data[data.length - 1].timestamp)
    };
}
async function updatePage(key, page, token, password) {
    for (let i = 0; i < 10; i++) {
        if (unlocking) {
            await sleep(init_1.config.recaptchaSleep);
            continue;
        }
        const result = await basicallyUpdatePage(key, page, token, password);
        if (result === 503) {
            log('503.');
            await sleep(init_1.config.congestionSleep);
            continue;
        }
        if (result === 500) {
            log('500.');
            await sleep(init_1.config.errSleep);
            continue;
        }
        if (result === 401)
            return 401;
        if (result === 403)
            return 403;
        return result;
    }
    return 500;
}
async function updatePages(lastMaxTime, span, token, password) {
    let maxTime = lastMaxTime;
    let minTime = lastMaxTime;
    for (let p = 1; p <= 100 && minTime + 60 * span >= lastMaxTime; p++) {
        const result = await updatePage('', p, token, password);
        if (result === 401)
            return 401;
        if (result === 403)
            return 403;
        if (result === 500)
            return 500;
        if (p === 1) {
            maxTime = result.maxTime;
        }
        minTime = result.minTime;
        log(`p${p} toured.`);
    }
    return { maxTime };
}
async function cycle(interval, span, token, password) {
    let maxTime = Date.now() / 1000;
    while (true) {
        const result = await updatePages(maxTime, span, token, password);
        if (result === 401) {
            out('401.');
            return;
        }
        if (result === 403) {
            out('403.');
            return;
        }
        if (result === 500) {
            out(`Fail to rescue under interval ${interval} and span ${span}.`);
        }
        else {
            maxTime = result.maxTime;
            out(`Rescurd under interval ${interval} and span ${span}.`);
        }
        await sleep(interval * 60);
    }
}
async function unlock() {
    if (unlocking)
        return;
    unlocking = true;
    const cp = await open('https://pkuhelper.pku.edu.cn/hole');
    await sleep(init_1.config.unlockingSleep);
    cp.kill();
    unlocking = false;
}
function prettyDate(stamp) {
    const date = new Date(Number(stamp + '000'));
    const now = new Date();
    const year = date.getFullYear();
    const nowYear = now.getFullYear();
    const md = (date.getMonth() + 1) + '/' +
        date.getDate();
    const nowMD = (now.getMonth() + 1) + '/' +
        now.getDate();
    const hms = date.getHours() + ':' +
        date.getMinutes() + ':' +
        date.getSeconds();
    if (year !== nowYear)
        return hms + ' ' + year + '/' + md;
    if (nowMD !== md)
        return hms + ' ' + md;
    return hms;
}
async function main() {
    Object.assign(init_1.config, JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), { encoding: 'utf8' })));
    const { token, password, schedules } = init_1.config;
    const promises = [];
    for (let i = 0; i < schedules.length; i++) {
        const schedule = schedules[i];
        promises.push(cycle(schedule.interval, schedule.span, token, password));
    }
    await Promise.all(promises);
}
exports.main = main;
