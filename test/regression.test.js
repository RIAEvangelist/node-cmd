'use strict';

const defineGroup = require('./support/group.js');
const {
    assert,
    cmd,
    collect,
    shellCommand
} = require('./support/process.js');

module.exports = defineGroup('Regression', (test) => {
    test('run preserves the callback-only overload', async () => {
        const result = await new Promise((resolve) => {
            cmd.run(shellCommand("process.stdout.write('callback')"), (error, data, stderr) => {
                resolve({error, data, stderr});
            });
        });

        assert.deepEqual(result, {error: null, data: 'callback', stderr: ''});
    });

    test('run preserves the options-only stream overload', async () => {
        const child = cmd.run(
            shellCommand("process.stdout.write('options stream')"),
            {encoding: 'utf8'}
        );
        const result = await collect(child);

        assert.equal(result.stdout, 'options stream');
        assert.equal(result.stderr, '');
    });

    test('runSync treats null options as defaults', () => {
        const result = cmd.runSync(
            shellCommand("process.stdout.write('null options')"),
            null
        );

        assert.equal(result.data, 'null options');
        assert.equal(result.err, null);
    });

    test('runSync defaults undefined encoding and stdio values', () => {
        const result = cmd.runSync(
            shellCommand("process.stdout.write('safe defaults')"),
            {encoding: undefined, stdio: undefined}
        );

        assert.equal(result.data, 'safe defaults');
        assert.equal(typeof result.data, 'string');
    });

    test('runSync preserves explicit stdio', () => {
        const result = cmd.runSync(
            shellCommand("process.stdout.write('explicit stdio')"),
            {stdio: 'pipe'}
        );

        assert.equal(result.data, 'explicit stdio');
    });

    test('runSync preserves buffered stderr on failure', () => {
        const result = cmd.runSync(
            shellCommand("process.stderr.write('buffer failure'); process.exit(4);"),
            {encoding: 'buffer'}
        );

        assert.ok(Buffer.isBuffer(result.err));
        assert.equal(result.err.toString(), 'buffer failure');
    });

    test('runSync normalizes command validation errors', () => {
        const result = cmd.runSync(42);

        assert.equal(result.data, null);
        assert.match(result.err, /command.*string/i);
        assert.equal(result.stderr, '');
    });

    test('runSync normalizes invalid options errors', () => {
        const result = cmd.runSync(shellCommand(''), 'invalid options');

        assert.equal(result.data, null);
        assert.match(result.err, /options/i);
        assert.equal(result.stderr, '');
    });

    test('runSync normalizes non-Error option failures', () => {
        const options = {};

        Object.defineProperty(options, 'encoding', {
            enumerable: true,
            get() {
                throw 'non-error option failure';
            }
        });

        assert.deepEqual(cmd.runSync(shellCommand(''), options), {
            data: null,
            err: 'non-error option failure',
            stderr: ''
        });
    });

    test('runFile preserves the callback-only overload', async () => {
        const result = await new Promise((resolve) => {
            const child = cmd.runFile(process.execPath, (error, stdout, stderr) => {
                resolve({error, stdout, stderr});
            });
            child.stdin.end();
        });

        assert.deepEqual(result, {error: null, stdout: '', stderr: ''});
    });

    test('runFile preserves the options-and-callback overload', async () => {
        const result = await new Promise((resolve) => {
            const child = cmd.runFile(
                process.execPath,
                {encoding: 'utf8'},
                (error, stdout, stderr) => resolve({error, stdout, stderr})
            );
            child.stdin.end();
        });

        assert.deepEqual(result, {error: null, stdout: '', stderr: ''});
    });

    test('runFile preserves the options-only stream overload', async () => {
        const child = cmd.runFile(process.execPath, {encoding: 'utf8'});
        const completed = collect(child);

        child.stdin.end("process.stdout.write('options without callback')");

        const result = await completed;
        assert.equal(result.stdout, 'options without callback');
        assert.equal(result.stderr, '');
    });

    test('runFile accepts undefined args with explicit options', async () => {
        const result = await new Promise((resolve) => {
            const child = cmd.runFile(
                process.execPath,
                undefined,
                {encoding: 'utf8'},
                (error, stdout, stderr) => resolve({error, stdout, stderr})
            );
            child.stdin.end();
        });

        assert.deepEqual(result, {error: null, stdout: '', stderr: ''});
    });

    test('runFile accepts null args with a callback', async () => {
        const result = await new Promise((resolve) => {
            const child = cmd.runFile(
                process.execPath,
                null,
                (error, stdout, stderr) => resolve({error, stdout, stderr})
            );
            child.stdin.end();
        });

        assert.deepEqual(result, {error: null, stdout: '', stderr: ''});
    });

    test('runFilePromise accepts undefined args with options', async () => {
        const promise = cmd.runFilePromise(
            process.execPath,
            undefined,
            {encoding: 'utf8'}
        );

        promise.child.stdin.end();
        assert.deepEqual(await promise, {stdout: '', stderr: ''});
    });

    test('runFileSync accepts undefined args with options', () => {
        const result = cmd.runFileSync(
            process.execPath,
            undefined,
            {encoding: 'utf8'}
        );

        assert.deepEqual(result, {data: '', err: null, stderr: null});
    });

    test('runStream accepts undefined args with options', async () => {
        const child = cmd.runStream(
            process.execPath,
            undefined,
            {stdio: ['pipe', 'pipe', 'pipe']}
        );
        const completed = collect(child);

        child.stdin.end("process.stdout.write('explicit options')");

        const result = await completed;
        assert.equal(result.stdout, 'explicit options');
    });

    test('runStream accepts null args with options', async () => {
        const child = cmd.runStream(
            process.execPath,
            null,
            {stdio: ['pipe', 'pipe', 'pipe']}
        );
        const completed = collect(child);

        child.stdin.end("process.stdout.write('null args')");

        const result = await completed;
        assert.equal(result.stdout, 'null args');
    });
});
