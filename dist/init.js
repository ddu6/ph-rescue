"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
[
    '../info/'
].map(val => path_1.join(__dirname, val)).forEach(val => {
    if (!fs_1.existsSync(val)) {
        fs_1.mkdirSync(val);
    }
});
exports.config = {
    domain: "example.com",
    token: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    password: "xxxxxxxx",
    autoUnlock: true,
    rescueHolesInterval: 10,
    rescueCommentsInterval: 60,
    restartDuration: 60,
    rescueCommentsSpans: [
        600,
        3600,
        86400,
    ],
    updateHolesSpans: [
        3600,
        86400,
    ],
    failureLimit: 10,
    congestionSleep: 0.5,
    stepSleep: 1,
    errSleep: 1,
    recaptchaSleep: 10,
    unlockSleep: 10,
    requestTimeout: 10,
};
const path = path_1.join(__dirname, '../config.json');
if (!fs_1.existsSync(path)) {
    fs_1.writeFileSync(path, JSON.stringify(exports.config, undefined, 4));
}
else {
    Object.assign(exports.config, JSON.parse(fs_1.readFileSync(path, { encoding: 'utf8' })));
}
