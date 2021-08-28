"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const init_1 = require("./init");
const playwright_chromium_1 = require("playwright-chromium");
const cli_tools_1 = require("@ddu6/cli-tools");
const clit = new cli_tools_1.CLIT(__dirname, init_1.config);
let unlocking = false;
async function sleep(time) {
    await new Promise(resolve => {
        setTimeout(resolve, time * 1000);
    });
}
async function get(path, params = {}) {
    const result = await clit.request(`https://${init_1.config.domain}/phs/${path}`, params);
    if (typeof result === 'number') {
        return result;
    }
    const { status, body } = result;
    if (status !== 200) {
        return status;
    }
    try {
        const { status, data } = JSON.parse(body);
        if (status === 200) {
            return { data: data };
        }
        if (typeof status === 'number') {
            return status;
        }
    }
    catch (err) {
        clit.log(err);
    }
    return 500;
}
async function basicallyGetComments(id, token, password) {
    const data = await get(`cs${id}`, {
        update: '',
        token: token,
        password: password
    });
    return data;
}
async function basicallyGetLocalComments(id, token, password) {
    const data = await get(`local/cs${id}`, {
        token: token,
        password: password
    });
    return data;
}
async function basicallyGetHole(id, token, password) {
    const data = await get(`h${id}`, {
        update: '',
        token: token,
        password: password
    });
    return data;
}
async function basicallyGetPage(p, key, token, password) {
    const data = await get(`p${p}`, {
        update: '',
        key: key,
        token: token,
        password: password
    });
    return data;
}
async function basicallyGetLocalPage(p, key, s, e, token, password) {
    const data = await get(`local/p${p}`, {
        key,
        s,
        e,
        token,
        password,
    });
    return data;
}
async function getLocalPage(p, key, s, e, token, password) {
    for (let i = 0; i < init_1.config.failureLimit; i++) {
        if (unlocking) {
            await sleep(init_1.config.recaptchaSleep);
            continue;
        }
        const result = await basicallyGetLocalPage(p, key, s, e, token, password);
        if (result === 503) {
            clit.log('503');
            await sleep(init_1.config.congestionSleep);
            continue;
        }
        if (result === 500) {
            clit.log('500');
            await sleep(init_1.config.errSleep);
            continue;
        }
        if (result === 401) {
            return 401;
        }
        if (result === 403) {
            return 403;
        }
        if (typeof result === 'number') {
            return 500;
        }
        return result;
    }
    return 500;
}
async function getLocalPages(key, s, e, token, password) {
    const data = [];
    for (let p = 1;; p++) {
        const result = await getLocalPage(p, key, s, e, token, password);
        if (result === 401) {
            return 401;
        }
        if (result === 403) {
            return 403;
        }
        if (result === 500) {
            return 500;
        }
        data.push(...result.data);
        if (result.data.length < 50) {
            break;
        }
    }
    return data;
}
async function basicallyUpdateComments(id, reply, token, password) {
    if (reply === 0) {
        return 200;
    }
    if (reply > 0) {
        const result0 = await basicallyGetLocalComments(id, token, password);
        if (result0 === 401) {
            return 401;
        }
        if (result0 === 403) {
            return 403;
        }
        if (result0 === 503) {
            return 503;
        }
        if (typeof result0 === 'number') {
            return 500;
        }
        const data0 = result0.data;
        const length0 = data0.length;
        if (length0 >= reply) {
            return 200;
        }
    }
    const result1 = await basicallyGetComments(id, token, password);
    if (result1 === 423) {
        return 423;
    }
    if (result1 === 401) {
        return 401;
    }
    if (result1 === 403) {
        return 403;
    }
    if (result1 === 503) {
        return 503;
    }
    if (result1 === 404) {
        return 404;
    }
    if (typeof result1 === 'number') {
        return 500;
    }
    const data1 = result1.data;
    for (let i = 0; i < data1.length; i++) {
        const { text } = data1[i];
        if (typeof text === 'string' && text.startsWith('[Helper]')) {
            return 423;
        }
    }
    if (data1.length > 0) {
        const cid = Math.max(...data1.map(val => Number(val.cid)));
        const timestamp = Math.max(...data1.map(val => Number(val.timestamp)));
        clit.log(`cs${id} updated to c${cid} which is in ${prettyTimestamp(timestamp)}`);
    }
    return 200;
}
async function updateComments(id, reply, token, password) {
    for (let i = 0; i < init_1.config.failureLimit; i++) {
        if (unlocking) {
            await sleep(init_1.config.recaptchaSleep);
            continue;
        }
        const result = await basicallyUpdateComments(id, reply, token, password);
        if (result === 503) {
            clit.log('503');
            await sleep(init_1.config.congestionSleep);
            continue;
        }
        if (result === 500) {
            clit.log('500');
            await sleep(init_1.config.errSleep);
            continue;
        }
        if (result === 423) {
            clit.log('423');
            if (init_1.config.autoUnlock) {
                await unlock();
            }
            await sleep(init_1.config.recaptchaSleep);
            continue;
        }
        if (result === 401) {
            return 401;
        }
        if (result === 403) {
            return 403;
        }
        return 200;
    }
    return 500;
}
async function basicallyUpdateHole(localData, token, password) {
    if (Number(localData.timestamp) === 0) {
        return 404;
    }
    if (Number(localData.hidden) === 1) {
        return 404;
    }
    const result1 = await basicallyGetHole(localData.pid, token, password);
    if (result1 === 401) {
        return 401;
    }
    if (result1 === 403) {
        return 403;
    }
    if (result1 === 503) {
        return 503;
    }
    if (result1 === 404) {
        return 404;
    }
    if (typeof result1 === 'number') {
        return 500;
    }
    const data1 = result1.data;
    const reply = Number(data1.reply);
    const deltaComments = reply - Number(localData.reply);
    const deltaLikes = Number(data1.likenum) - Number(localData.likenum);
    if (deltaComments > 0
        || deltaLikes !== 0) {
        clit.log(`h${localData.pid} updated by ${deltaComments} comments and ${deltaLikes} likes`);
    }
    return await updateComments(localData.pid, reply, token, password);
}
async function updateHole(localData, token, password) {
    for (let i = 0; i < init_1.config.failureLimit; i++) {
        if (unlocking) {
            await sleep(init_1.config.recaptchaSleep);
            continue;
        }
        const result = await basicallyUpdateHole(localData, token, password);
        if (result === 503) {
            clit.out('503');
            await sleep(init_1.config.congestionSleep);
            continue;
        }
        if (result === 500) {
            clit.out('500');
            await sleep(init_1.config.errSleep);
            continue;
        }
        if (result === 401) {
            return 401;
        }
        if (result === 403) {
            return 403;
        }
        return 200;
    }
    return 500;
}
async function basicallyUpdatePage(p, key, token, password) {
    const result = await basicallyGetPage(p, key, token, password);
    if (result === 401) {
        return 401;
    }
    if (result === 403) {
        return 403;
    }
    if (result === 503) {
        return 503;
    }
    if (typeof result === 'number') {
        return 500;
    }
    const data = result.data;
    return {
        maxTime: Number(data[0].timestamp),
        minTime: Number(data[data.length - 1].timestamp)
    };
}
async function updatePage(p, key, token, password) {
    for (let i = 0; i < init_1.config.failureLimit; i++) {
        if (unlocking) {
            await sleep(init_1.config.recaptchaSleep);
            continue;
        }
        const result = await basicallyUpdatePage(p, key, token, password);
        if (result === 503) {
            clit.log('503');
            await sleep(init_1.config.congestionSleep);
            continue;
        }
        if (result === 500) {
            clit.log('500');
            await sleep(init_1.config.errSleep);
            continue;
        }
        if (result === 401) {
            return 401;
        }
        if (result === 403) {
            return 403;
        }
        return result;
    }
    return 500;
}
async function updatePages(lastMaxTime, span, token, password) {
    let maxTime = lastMaxTime;
    let minTime = lastMaxTime;
    for (let p = 1; p <= 100 && minTime + span >= lastMaxTime; p++) {
        const result = await updatePage(p, '', token, password);
        if (result === 401) {
            return 401;
        }
        if (result === 403) {
            return 403;
        }
        if (result === 500) {
            return 500;
        }
        if (p === 1) {
            maxTime = result.maxTime;
        }
        minTime = result.minTime;
    }
    return { maxTime };
}
async function rescueHoles(token, password) {
    let maxTime = Math.floor(Date.now() / 1000) - init_1.config.restartDuration;
    while (true) {
        const result = await updatePages(maxTime, 0, token, password);
        if (result === 401) {
            clit.out('401');
            return;
        }
        if (result === 403) {
            clit.out('403');
            return;
        }
        if (result === 500) {
            clit.out(`Fail to rescue holes after ${prettyTimestamp(maxTime)}`);
        }
        else {
            clit.log(`Rescue holes after ${prettyTimestamp(maxTime)}`);
            maxTime = result.maxTime;
        }
        await sleep(init_1.config.rescueHolesInterval);
    }
}
async function rescueComments(token, password) {
    let last = Math.floor(Date.now() / 1000) - init_1.config.rescueCommentsInterval - init_1.config.restartDuration;
    while (true) {
        const now = Math.floor(Date.now() / 1000);
        normal: {
            for (let i = 0; i < init_1.config.rescueCommentsSpans.length; i++) {
                const span = init_1.config.rescueCommentsSpans[i];
                const e = now - span;
                const s = last - span;
                const result = await getLocalPages('', s.toString(), e.toString(), token, password);
                if (result === 401) {
                    clit.out('401');
                    return;
                }
                if (result === 403) {
                    clit.out('403');
                    return;
                }
                if (result === 500) {
                    clit.out(`Fail to rescue comments between ${prettyTimestamp(s)} and ${prettyTimestamp(e)}`);
                    break normal;
                }
                const strict = init_1.config.updateHolesSpans.includes(span);
                for (let i = 0; i < result.length; i++) {
                    const item = result[i];
                    const id = Number(item.pid);
                    let result1;
                    if (strict) {
                        result1 = await updateHole(item, token, password);
                    }
                    else {
                        result1 = await updateComments(id, -1, token, password);
                    }
                    if (result1 === 401) {
                        clit.out('401');
                        return;
                    }
                    if (result1 === 403) {
                        clit.out('403');
                        return;
                    }
                    if (result1 === 500) {
                        clit.out(`Fail to rescue comments between ${prettyTimestamp(s)} and ${prettyTimestamp(e)}`);
                        break normal;
                    }
                }
                clit.log(`Rescue comments between ${prettyTimestamp(s)} and ${prettyTimestamp(e)} under span ${span}`);
            }
            last = now;
        }
        await sleep(init_1.config.rescueCommentsInterval);
    }
}
async function unlock() {
    if (unlocking) {
        return;
    }
    unlocking = true;
    const browser = await playwright_chromium_1.chromium.launch();
    const context = await browser.newContext({ storageState: { origins: [{
                    origin: 'https://pkuhelper.pku.edu.cn',
                    localStorage: [{
                            name: 'TOKEN',
                            value: init_1.config.token
                        }]
                }] } });
    const page = await context.newPage();
    try {
        await page.goto('https://pkuhelper.pku.edu.cn/hole', { timeout: init_1.config.unlockSleep * 1000 });
    }
    catch (err) {
        clit.log(err);
    }
    await sleep(init_1.config.unlockSleep);
    await browser.close();
    unlocking = false;
}
function prettyTimestamp(stamp) {
    const date = new Date(Number(stamp + '000'));
    return [
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
    ]
        .map(val => val.toString().padStart(2, '0'))
        .join(':')
        + ' '
        + [
            date.getMonth() + 1,
            date.getDate(),
            date.getFullYear(),
        ]
            .map(val => val.toString().padStart(2, '0'))
            .join('/');
}
async function main() {
    const { token, password } = init_1.config;
    const promises = [];
    promises.push(rescueHoles(token, password), rescueComments(token, password));
    await Promise.all(promises);
}
exports.main = main;
