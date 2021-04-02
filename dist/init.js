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
    base: "https://ddu6.xyz/services/ph-get/",
    timeout: 10,
    period: 10
};
const path0 = path.join(__dirname, '../config.json');
if (!fs.existsSync(path0))
    fs.writeFileSync(path0, JSON.stringify(exports.config).replace(/([,{])/g, '$1\n    ').replace('}', '\n}\n'));
