"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const fs = require("fs");
const path = require("path");
[
    '../info/'
].map(val => path.join(__dirname, val)).forEach(val => {
    if (!fs.existsSync(val))
        fs.mkdirSync(val);
});
exports.config = {
    token: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    password: "xxxxxxxx",
    autoUnlock: false,
    schedules: [
        {
            interval: 1,
            span: 0,
        },
        {
            interval: 10,
            span: 60,
        },
        {
            interval: 300,
            span: 600,
        }
    ],
    threads: 5,
    congestionSleep: 0.5,
    stepSleep: 1,
    errSleep: 1,
    recaptchaSleep: 10,
    unlockingSleep: 10,
    timeout: 5,
    base: "https://ddu6.xyz/services/ph-get/",
};
const path0 = path.join(__dirname, '../config.json');
if (!fs.existsSync(path0))
    fs.writeFileSync(path0, JSON.stringify(exports.config, null, 4));
