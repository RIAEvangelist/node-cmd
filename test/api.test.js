'use strict';

const assert = require('node:assert/strict');
const {once} = require('node:events');
const {spawnSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const path = require('node:path');

const cmd = require('../cmd.js');
const cases = [];

function test(description, callback) {
    cases.push({description, callback});
}

function shellCommand(source) {
    const payload = Buffer.from(source).toString('base64');
    const executable = `"${process.execPath}"`;
    const bootstrap = `"eval(Buffer.from('${payload}','base64').toString())"`;

    return `${executable} -e ${bootstrap}`;
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

test('CommonJS exports preserve the classic API and add modern methods', () => {
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
    assert.equal(cmd.runPromisified, cmd.runPromise);
    assert.equal(cmd.runFilePromisified, cmd.runFilePromise);
});

test('ESM provides default and named exports', async () => {
    const moduleUrl = pathToFileURL(path.resolve(__dirname, '../cmd.mjs'));
    const imported = await import(moduleUrl);

    assert.equal(imported.default, cmd);

    for (const name of Object.keys(cmd)) {
        assert.equal(imported[name], cmd[name], `${name} should be the same ESM export`);
    }
});

test('run supports callbacks, output capture, and child process access', async () => {
    const result = await bufferedRun(shellCommand(
        "process.stdout.write('out'); process.stderr.write('err');"
    ));

    assert.equal(result.error, null);
    assert.equal(result.data, 'out');
    assert.equal(result.stderr, 'err');
    assert.ok(result.child.pid > 0);
});

test('run forwards options while preserving the callback overload', async () => {
    const expectedCwd = path.resolve(__dirname, '..');
    const env = {...process.env, NODE_CMD_VALUE: 'forwarded'};
    const result = await bufferedRun(
        shellCommand(
            "process.stdout.write(JSON.stringify({cwd: process.cwd(), value: process.env.NODE_CMD_VALUE}));"
        ),
        {cwd: expectedCwd, env, encoding: 'utf8'}
    );
    const output = JSON.parse(result.data);

    assert.equal(result.error, null);
    assert.equal(path.resolve(output.cwd), expectedCwd);
    assert.equal(output.value, 'forwarded');

    const callbackOnly = await new Promise((resolve) => {
        cmd.run(shellCommand("process.stdout.write('callback')"), (error, data, stderr) => {
            resolve({error, data, stderr});
        });
    });

    assert.equal(callbackOnly.error, null);
    assert.equal(callbackOnly.data, 'callback');
    assert.equal(callbackOnly.stderr, '');
});

test('run without a callback still exposes live streams', async () => {
    const child = cmd.run(shellCommand("process.stdout.write('streamed')"));
    const result = await collect(child);

    assert.equal(result.code, 0);
    assert.equal(result.signal, null);
    assert.equal(result.stdout, 'streamed');
    assert.equal(result.stderr, '');

    const optionsChild = cmd.run(
        shellCommand("process.stdout.write('options stream')"),
        {encoding: 'utf8'}
    );
    const optionsResult = await collect(optionsChild);
    assert.equal(optionsResult.stdout, 'options stream');
});

test('run supports interactive stdin through the returned ChildProcess', async () => {
    const child = cmd.run(shellCommand(
        "process.stdin.setEncoding('utf8'); process.stdin.once('data', value => process.stdout.write(value.trim().toUpperCase()));"
    ));
    const completed = collect(child);

    child.stdin.end('ping\n');

    const result = await completed;
    assert.equal(result.code, 0);
    assert.equal(result.stdout, 'PING');
});

test('runPromise resolves output and exposes its child', async () => {
    const promise = cmd.runPromise(
        shellCommand("process.stdout.write(process.env.NODE_CMD_PROMISE); process.stderr.write('note');"),
        {env: {...process.env, NODE_CMD_PROMISE: 'resolved'}, encoding: 'utf8'}
    );

    assert.ok(promise.child.pid > 0);
    await assert.doesNotReject(promise);

    const result = await promise;
    assert.deepEqual(result, {stdout: 'resolved', stderr: 'note'});

    const defaultOptions = await cmd.runPromise(shellCommand("process.stdout.write('default')"));
    assert.equal(defaultOptions.stdout, 'default');
});

test('runPromise rejects with exit and output metadata', async () => {
    await assert.rejects(
        cmd.runPromise(shellCommand(
            "process.stdout.write('before'); process.stderr.write('failed'); process.exit(7);"
        )),
        (error) => {
            assert.equal(error.code, 7);
            assert.equal(error.stdout, 'before');
            assert.equal(error.stderr, 'failed');
            return true;
        }
    );
});

test('runPromise forwards AbortSignal cancellation', async () => {
    const controller = new AbortController();
    const promise = cmd.runPromise(
        shellCommand('setInterval(() => {}, 1_000);'),
        {signal: controller.signal}
    );

    controller.abort();

    await assert.rejects(promise, (error) => {
        assert.equal(error.name, 'AbortError');
        return true;
    });
});

test('runSync preserves its result envelope and supports options', () => {
    const success = cmd.runSync(shellCommand("process.stdout.write('sync')"));
    assert.deepEqual(success, {data: 'sync', err: null, stderr: null});

    const nullOptions = cmd.runSync(
        shellCommand("process.stdout.write('null options')"),
        null
    );
    assert.equal(nullOptions.data, 'null options');

    const undefinedOptionValues = cmd.runSync(
        shellCommand("process.stdout.write('safe defaults')"),
        {encoding: undefined, stdio: undefined}
    );
    assert.equal(undefinedOptionValues.data, 'safe defaults');
    assert.equal(typeof undefinedOptionValues.data, 'string');

    const explicitStdio = cmd.runSync(
        shellCommand("process.stdout.write('explicit stdio')"),
        {stdio: 'pipe'}
    );
    assert.equal(explicitStdio.data, 'explicit stdio');

    const buffered = cmd.runSync(
        shellCommand("process.stdout.write('bytes')"),
        {encoding: 'buffer'}
    );
    assert.ok(Buffer.isBuffer(buffered.data));
    assert.equal(buffered.data.toString(), 'bytes');
    assert.equal(buffered.err, null);

    const failure = cmd.runSync(shellCommand(
        "process.stderr.write('sync failure'); process.exit(9);"
    ));
    assert.deepEqual(failure, {
        data: null,
        err: 'sync failure',
        stderr: 'sync failure'
    });

    const bufferedFailure = cmd.runSync(
        shellCommand("process.stderr.write('buffer failure'); process.exit(4);"),
        {encoding: 'buffer'}
    );
    assert.ok(Buffer.isBuffer(bufferedFailure.err));
    assert.equal(bufferedFailure.err.toString(), 'buffer failure');
});

test('runSync returns the original validation error instead of throwing again', () => {
    const result = cmd.runSync(42);

    assert.equal(result.data, null);
    assert.match(result.err, /command.*string/i);
    assert.equal(result.stderr, '');

    const badOptions = cmd.runSync(shellCommand(''), 'invalid options');
    assert.equal(badOptions.data, null);
    assert.match(badOptions.err, /options/i);

    const throwingOptions = {};
    Object.defineProperty(throwingOptions, 'encoding', {
        enumerable: true,
        get() {
            throw 'non-error option failure';
        }
    });
    assert.deepEqual(cmd.runSync(shellCommand(''), throwingOptions), {
        data: null,
        err: 'non-error option failure',
        stderr: ''
    });
});

test('runSync keeps captured stderr out of the parent process', () => {
    const modulePath = path.resolve(__dirname, '../cmd.js');
    const command = shellCommand("process.stderr.write('private stderr')");
    const probe = spawnSync(
        process.execPath,
        [
            '-e',
            `require(${JSON.stringify(modulePath)}).runSync(${JSON.stringify(command)}, {encoding: undefined, stdio: undefined});`
        ],
        {encoding: 'utf8'}
    );

    assert.equal(probe.status, 0);
    assert.equal(probe.stdout, '');
    assert.equal(probe.stderr, '');
});

test('runFile passes shell metacharacters as literal arguments', async () => {
    const values = ['with spaces', 'ampersand&value', 'semi;colon', '"quoted"'];
    const source = 'process.stdout.write(JSON.stringify(process.argv.slice(1)));';

    const result = await new Promise((resolve) => {
        const child = cmd.runFile(
            process.execPath,
            ['-e', source, ...values],
            {encoding: 'utf8'},
            (error, stdout, stderr) => resolve({child, error, stdout, stderr})
        );

        assert.ok(child.pid > 0);
    });

    assert.equal(result.error, null);
    assert.deepEqual(JSON.parse(result.stdout), values);
    assert.equal(result.stderr, '');
});

test('runFile supports its callback overloads', async () => {
    const withArgs = await new Promise((resolve) => {
        cmd.runFile(
            process.execPath,
            ['-e', "process.stdout.write('args callback')"],
            (error, stdout, stderr) => resolve({error, stdout, stderr})
        );
    });
    assert.deepEqual(withArgs, {error: null, stdout: 'args callback', stderr: ''});

    const callbackOnly = await new Promise((resolve) => {
        const child = cmd.runFile(process.execPath, (error, stdout, stderr) => {
            resolve({error, stdout, stderr});
        });
        child.stdin.end();
    });
    assert.equal(callbackOnly.error, null);
    assert.equal(callbackOnly.stdout, '');

    const optionsOnly = await new Promise((resolve) => {
        const child = cmd.runFile(
            process.execPath,
            {encoding: 'utf8'},
            (error, stdout, stderr) => resolve({error, stdout, stderr})
        );
        child.stdin.end();
    });
    assert.equal(optionsOnly.error, null);
    assert.equal(optionsOnly.stderr, '');

    const optionsWithoutCallback = cmd.runFile(
        process.execPath,
        {encoding: 'utf8'}
    );
    const optionsWithoutCallbackResult = collect(optionsWithoutCallback);
    optionsWithoutCallback.stdin.end("process.stdout.write('options without callback')");
    assert.equal(
        (await optionsWithoutCallbackResult).stdout,
        'options without callback'
    );

    const child = cmd.runFile(process.execPath, ['--version']);
    const streamed = await collect(child);
    assert.equal(streamed.code, 0);
    assert.match(streamed.stdout, /^v\d+/);

    const optionsChild = cmd.runFile(
        process.execPath,
        ['-e', "process.stdout.write('options child')"],
        {encoding: 'utf8'}
    );
    const optionsResult = await collect(optionsChild);
    assert.equal(optionsResult.stdout, 'options child');

    const explicitOptionalArgs = await new Promise((resolve) => {
        const childWithOptions = cmd.runFile(
            process.execPath,
            undefined,
            {encoding: 'utf8'},
            (error, stdout, stderr) => resolve({error, stdout, stderr})
        );
        childWithOptions.stdin.end();
    });
    assert.equal(explicitOptionalArgs.error, null);
    assert.equal(explicitOptionalArgs.stdout, '');

    const nullArgsCallback = await new Promise((resolve) => {
        const childWithNullArgs = cmd.runFile(
            process.execPath,
            null,
            (error, stdout, stderr) => resolve({error, stdout, stderr})
        );
        childWithNullArgs.stdin.end();
    });
    assert.equal(nullArgsCallback.error, null);
    assert.equal(nullArgsCallback.stderr, '');
});

test('runFilePromise resolves, rejects, and preserves its process handle', async () => {
    const direct = cmd.runFilePromise(
        process.execPath,
        ['-e', "process.stdout.write('file promise')"]
    );
    assert.ok(direct.child.pid > 0);
    assert.equal((await direct).stdout, 'file promise');

    const withOptions = await cmd.runFilePromise(
        process.execPath,
        ['-e', "process.stdout.write(process.env.NODE_CMD_FILE)"],
        {env: {...process.env, NODE_CMD_FILE: 'options'}, encoding: 'utf8'}
    );
    assert.equal(withOptions.stdout, 'options');

    const explicitOptionalArgs = cmd.runFilePromise(
        process.execPath,
        undefined,
        {encoding: 'utf8'}
    );
    explicitOptionalArgs.child.stdin.end();
    assert.equal((await explicitOptionalArgs).stdout, '');

    await assert.rejects(
        cmd.runFilePromise(process.execPath, ['-e', 'process.exit(6)']),
        (error) => error.code === 6
    );
});

test('runFileSync supports direct args, options, and failures', () => {
    const success = cmd.runFileSync(
        process.execPath,
        ['-e', "process.stdout.write('file sync')"]
    );
    assert.deepEqual(success, {data: 'file sync', err: null, stderr: null});

    const buffered = cmd.runFileSync(
        process.execPath,
        ['-e', "process.stdout.write('buffer')"],
        {encoding: 'buffer'}
    );
    assert.ok(Buffer.isBuffer(buffered.data));

    const explicitOptionalArgs = cmd.runFileSync(
        process.execPath,
        undefined,
        {encoding: 'utf8'}
    );
    assert.equal(explicitOptionalArgs.data, '');

    const failure = cmd.runFileSync(
        process.execPath,
        ['-e', "process.stderr.write('direct failure'); process.exit(3)"]
    );
    assert.deepEqual(failure, {
        data: null,
        err: 'direct failure',
        stderr: 'direct failure'
    });
});

test('runStream is unbuffered and supports direct options', async () => {
    const withArgs = cmd.runStream(
        process.execPath,
        ['-e', "process.stdout.write('unbuffered')"],
        {stdio: ['ignore', 'pipe', 'pipe']}
    );
    const first = await collect(withArgs);
    assert.equal(first.code, 0);
    assert.equal(first.stdout, 'unbuffered');

    const noOptions = cmd.runStream(
        process.execPath,
        ['-e', "process.stdout.write('defaults')"]
    );
    const second = await collect(noOptions);
    assert.equal(second.stdout, 'defaults');

    const optionsOnly = cmd.runStream(process.execPath, {
        stdio: ['pipe', 'pipe', 'pipe']
    });
    const third = collect(optionsOnly);
    optionsOnly.stdin.end("process.stdout.write('stdin program')");
    assert.equal((await third).stdout, 'stdin program');

    const explicitOptionalArgs = cmd.runStream(
        process.execPath,
        undefined,
        {stdio: ['pipe', 'pipe', 'pipe']}
    );
    const fourth = collect(explicitOptionalArgs);
    explicitOptionalArgs.stdin.end("process.stdout.write('explicit options')");
    assert.equal((await fourth).stdout, 'explicit options');

    const nullArgs = cmd.runStream(
        process.execPath,
        null,
        {stdio: ['pipe', 'pipe', 'pipe']}
    );
    const fifth = collect(nullArgs);
    nullArgs.stdin.end("process.stdout.write('null args')");
    assert.equal((await fifth).stdout, 'null args');
});

async function run() {
    const {default: VanillaTest} = await import('vanilla-test');
    const suite = new VanillaTest();

    for (const {description, callback} of cases) {
        suite.expects(description);

        try {
            await callback();
            suite.pass();
        } catch (error) {
            console.error(error?.stack || error);
            suite.fail();
        }

        suite.done();
    }

    return suite.report();
}

module.exports = run;
module.exports.run = run;
