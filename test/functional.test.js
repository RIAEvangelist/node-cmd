'use strict';

const defineGroup = require('./support/group.js');
const {
    assert,
    bufferedRun,
    cmd,
    collect,
    shellCommand
} = require('./support/process.js');

module.exports = defineGroup('Functional', (test) => {
    test('run callback receives stdout and stderr and returns its child', async () => {
        const result = await bufferedRun(shellCommand(
            "process.stdout.write('out'); process.stderr.write('err');"
        ));

        assert.equal(result.error, null);
        assert.equal(result.data, 'out');
        assert.equal(result.stderr, 'err');
        assert.ok(result.child.pid > 0);
    });

    test('run without a callback exposes live output streams', async () => {
        const child = cmd.run(shellCommand("process.stdout.write('streamed')"));
        const result = await collect(child);

        assert.equal(result.code, 0);
        assert.equal(result.signal, null);
        assert.equal(result.stdout, 'streamed');
        assert.equal(result.stderr, '');
    });

    test('runPromise resolves buffered output and exposes its child', async () => {
        const promise = cmd.runPromise(
            shellCommand("process.stdout.write('resolved'); process.stderr.write('note');"),
            {encoding: 'utf8'}
        );

        assert.ok(promise.child.pid > 0);
        await assert.doesNotReject(promise);
        assert.deepEqual(await promise, {stdout: 'resolved', stderr: 'note'});
    });

    test('runPromise works with default options', async () => {
        const result = await cmd.runPromise(shellCommand("process.stdout.write('default')"));

        assert.equal(result.stdout, 'default');
        assert.equal(result.stderr, '');
    });

    test('runPromise rejection retains exit and output metadata', async () => {
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

    test('runSync returns the legacy success envelope', () => {
        const result = cmd.runSync(shellCommand("process.stdout.write('sync')"));

        assert.deepEqual(result, {data: 'sync', err: null, stderr: null});
    });

    test('runSync supports buffered output', () => {
        const result = cmd.runSync(
            shellCommand("process.stdout.write('bytes')"),
            {encoding: 'buffer'}
        );

        assert.ok(Buffer.isBuffer(result.data));
        assert.equal(result.data.toString(), 'bytes');
        assert.equal(result.err, null);
    });

    test('runSync returns the legacy failure envelope', () => {
        const result = cmd.runSync(shellCommand(
            "process.stderr.write('sync failure'); process.exit(9);"
        ));

        assert.deepEqual(result, {
            data: null,
            err: 'sync failure',
            stderr: 'sync failure'
        });
    });

    test('runFile executes direct arguments with a callback', async () => {
        const result = await new Promise((resolve) => {
            cmd.runFile(
                process.execPath,
                ['-e', "process.stdout.write('args callback')"],
                (error, stdout, stderr) => resolve({error, stdout, stderr})
            );
        });

        assert.deepEqual(result, {error: null, stdout: 'args callback', stderr: ''});
    });

    test('runFile executes direct arguments without a callback', async () => {
        const child = cmd.runFile(process.execPath, ['--version']);
        const result = await collect(child);

        assert.equal(result.code, 0);
        assert.match(result.stdout, /^v\d+/);
    });

    test('runFile forwards direct arguments and options', async () => {
        const child = cmd.runFile(
            process.execPath,
            ['-e', "process.stdout.write('options child')"],
            {encoding: 'utf8'}
        );
        const result = await collect(child);

        assert.equal(result.stdout, 'options child');
        assert.equal(result.stderr, '');
    });

    test('runFilePromise resolves output and exposes its child', async () => {
        const promise = cmd.runFilePromise(
            process.execPath,
            ['-e', "process.stdout.write('file promise')"]
        );

        assert.ok(promise.child.pid > 0);
        assert.equal((await promise).stdout, 'file promise');
    });

    test('runFilePromise rejects for a nonzero exit', async () => {
        await assert.rejects(
            cmd.runFilePromise(process.execPath, ['-e', 'process.exit(6)']),
            (error) => error.code === 6
        );
    });

    test('runFileSync returns the legacy success envelope', () => {
        const result = cmd.runFileSync(
            process.execPath,
            ['-e', "process.stdout.write('file sync')"]
        );

        assert.deepEqual(result, {data: 'file sync', err: null, stderr: null});
    });

    test('runFileSync supports buffered output', () => {
        const result = cmd.runFileSync(
            process.execPath,
            ['-e', "process.stdout.write('buffer')"],
            {encoding: 'buffer'}
        );

        assert.ok(Buffer.isBuffer(result.data));
        assert.equal(result.data.toString(), 'buffer');
    });

    test('runFileSync returns the legacy failure envelope', () => {
        const result = cmd.runFileSync(
            process.execPath,
            ['-e', "process.stderr.write('direct failure'); process.exit(3)"]
        );

        assert.deepEqual(result, {
            data: null,
            err: 'direct failure',
            stderr: 'direct failure'
        });
    });

    test('runStream executes direct arguments with default options', async () => {
        const child = cmd.runStream(
            process.execPath,
            ['-e', "process.stdout.write('defaults')"]
        );
        const result = await collect(child);

        assert.equal(result.code, 0);
        assert.equal(result.stdout, 'defaults');
        assert.equal(result.stderr, '');
    });
});
