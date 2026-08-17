'use strict';

const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {once} = require('node:events');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

const repositoryRoot = path.resolve(__dirname, '../..');
const modulePath = path.resolve(repositoryRoot, 'cmd.js');
const moduleUrl = pathToFileURL(path.resolve(repositoryRoot, 'cmd.mjs'));
const cmd = require(modulePath);

function shellCommand(source) {
    const payload = Buffer.from(source).toString('base64');
    const executable = '"' + process.execPath + '"';
    const bootstrap = '"eval(Buffer.from(\'' + payload + '\',\'base64\').toString())"';

    return executable + ' -e ' + bootstrap;
}

function bufferedRun(command, options) {
    return new Promise((resolve, reject) => {
        const child = cmd.run(command, options, (error, data, stderr) => {
            try {
                resolve({child, error, data, stderr});
            } catch (assertionError) {
                reject(assertionError);
            }
        });

        assert.ok(child.pid > 0);
    });
}

function collect(child) {
    const stdout = [];
    const stderr = [];

    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));

    return once(child, 'close').then(([code, signal]) => ({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString(),
        stderr: Buffer.concat(stderr).toString()
    }));
}

module.exports = {
    assert,
    bufferedRun,
    cmd,
    collect,
    modulePath,
    moduleUrl,
    path,
    repositoryRoot,
    shellCommand,
    spawnSync
};
