'use strict';

const defineGroup = require('./support/group.js');
const {assert, cmd, moduleUrl} = require('./support/process.js');

module.exports = defineGroup('Unit', (test) => {
    test('CommonJS exposes exactly the documented API', () => {
        assert.deepEqual(Object.keys(cmd), [
            'run',
            'runSync',
            'runPromise',
            'runPromisified',
            'runFile',
            'runFileSync',
            'runFilePromise',
            'runFilePromisified',
            'runStream'
        ]);
    });

    test('runPromisified aliases runPromise', () => {
        assert.equal(cmd.runPromisified, cmd.runPromise);
    });

    test('runFilePromisified aliases runFilePromise', () => {
        assert.equal(cmd.runFilePromisified, cmd.runFilePromise);
    });

    test('ESM default export is the CommonJS API object', async () => {
        const imported = await import(moduleUrl);

        assert.equal(imported.default, cmd);
    });

    test('ESM named exports reference the CommonJS implementations', async () => {
        const imported = await import(moduleUrl);

        for (const name of Object.keys(cmd)) {
            assert.equal(imported[name], cmd[name], name + ' should be the same ESM export');
        }
    });
});
