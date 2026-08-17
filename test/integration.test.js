'use strict';

const defineGroup = require('./support/group.js');
const {
    assert,
    bufferedRun,
    cmd,
    collect,
    modulePath,
    path,
    repositoryRoot,
    shellCommand,
    spawnSync
} = require('./support/process.js');

module.exports = defineGroup('Integration', (test) => {
    test('run forwards cwd environment and encoding', async () => {
        const env = {...process.env, NODE_CMD_VALUE: 'forwarded'};
        const result = await bufferedRun(
            shellCommand(
                "process.stdout.write(JSON.stringify({cwd: process.cwd(), value: process.env.NODE_CMD_VALUE}));"
            ),
            {cwd: repositoryRoot, env, encoding: 'utf8'}
        );
        const output = JSON.parse(result.data);

        assert.equal(result.error, null);
        assert.equal(path.resolve(output.cwd), repositoryRoot);
        assert.equal(output.value, 'forwarded');
    });

    test('run accepts interactive stdin through its child', async () => {
        const child = cmd.run(shellCommand(
            "process.stdin.setEncoding('utf8'); process.stdin.once('data', value => process.stdout.write(value.trim().toUpperCase()));"
        ));
        const completed = collect(child);

        child.stdin.end('ping\n');

        const result = await completed;
        assert.equal(result.code, 0);
        assert.equal(result.stdout, 'PING');
    });

    test('runPromise forwards AbortSignal cancellation', async () => {
        const controller = new AbortController();
        const promise = cmd.runPromise(
            shellCommand('setInterval(() => {}, 1_000);'),
            {signal: controller.signal}
        );
        const rejected = assert.rejects(promise, (error) => {
            assert.equal(error.name, 'AbortError');
            return true;
        });

        controller.abort();
        await rejected;
    });

    test('runSync keeps captured stderr out of the parent', () => {
        const command = shellCommand("process.stderr.write('private stderr')");
        const source = 'require(' + JSON.stringify(modulePath) + ').runSync(' +
            JSON.stringify(command) +
            ', {encoding: undefined, stdio: undefined});';
        const probe = spawnSync(
            process.execPath,
            ['-e', source],
            {encoding: 'utf8'}
        );

        assert.equal(probe.status, 0);
        assert.equal(probe.stdout, '');
        assert.equal(probe.stderr, '');
    });

    test('runFile preserves shell metacharacters as literal arguments', async () => {
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

    test('runFilePromise forwards environment and encoding', async () => {
        const result = await cmd.runFilePromise(
            process.execPath,
            ['-e', "process.stdout.write(process.env.NODE_CMD_FILE)"],
            {env: {...process.env, NODE_CMD_FILE: 'options'}, encoding: 'utf8'}
        );

        assert.equal(result.stdout, 'options');
        assert.equal(result.stderr, '');
    });

    test('runStream honors explicit stdio configuration', async () => {
        const child = cmd.runStream(
            process.execPath,
            ['-e', "process.stdout.write('unbuffered')"],
            {stdio: ['ignore', 'pipe', 'pipe']}
        );
        const result = await collect(child);

        assert.equal(result.code, 0);
        assert.equal(result.stdout, 'unbuffered');
        assert.equal(result.stderr, '');
    });

    test('runStream accepts a program through piped stdin', async () => {
        const child = cmd.runStream(process.execPath, {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        const completed = collect(child);

        child.stdin.end("process.stdout.write('stdin program')");

        const result = await completed;
        assert.equal(result.code, 0);
        assert.equal(result.stdout, 'stdin program');
    });
});
