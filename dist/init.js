"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
[
    '../info/'
].map(val => path.join(__dirname, val)).forEach(val => {
    if (!fs.existsSync(val))
        fs.mkdirSync(val);
});
const path0 = path.join(__dirname, '../config.json');
if (!fs.existsSync(path0))
    fs.writeFileSync(path0, `{
    "token":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "password":"xxxxxxxx",
    "domain":"ddu6.xyz",
    "threads":2,
    "congestionSleep":3,
    "errSleep":5,
    "recaptchaSleep":60,
    "timeout":10,
    "interval":1,
    "period":60,
    "depth":10
}`);
