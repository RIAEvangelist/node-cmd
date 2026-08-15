# Migrating from node-cmd v5 to v6

Version 6 preserves the small CommonJS API while adding native ES module exports, Promise methods, direct executable methods, an unbuffered stream method, and forwarded Node child-process options. The major-version change primarily reflects the new Node.js runtime floor and explicit package exports.

## Runtime

- Upgrade to Node.js 22.12 or newer.
- Install normally with `npm install node-cmd`.
- The package still has zero runtime dependencies.
- No transpiler, bundler, or TypeScript toolchain is required.

## CommonJS and ES modules

The existing CommonJS import remains supported:

```js
const cmd = require('node-cmd');

cmd.run('node --version', (error, data, stderr) => {
    if (error) console.error(stderr || error.message);
    else console.log(data);
});
```

Version 6 also provides a native ES module entry point with default and named exports:

```js
import cmd, {
    run,
    runSync,
    runPromise,
    runFile,
    runFileSync,
    runFilePromise,
    runStream
} from 'node-cmd';
```

Conditional exports select the correct implementation for `require()` or `import`. The old CommonJS deep path remains explicitly available:

```js
const cmd = require('node-cmd/cmd');
```

The extension-bearing `require('node-cmd/cmd.js')` form also remains available. Prefer `require('node-cmd')` in new CommonJS code so package entry-point changes remain transparent.

## Existing callback and synchronous calls

These v5 forms continue to work:

```js
cmd.run(command, callback);
const result = cmd.runSync(command);
```

`run()` still returns the `ChildProcess`, and its callback remains `(error, data, stderr)`.

`runSync()` retains the legacy result keys:

```js
{
    err,
    data,
    stderr
}
```

On success, `err` is `null` and `data` contains standard output. Ordinary command failures are represented through `err` and `stderr` rather than changing the public result shape.

## Forward execution options

The asynchronous overload accepts either a callback or options plus a callback:

```js
cmd.run(command, callback);
cmd.run(command, options, callback);
```

Synchronous calls accept options after the command:

```js
const result = cmd.runSync(command, {
    cwd: process.cwd(),
    timeout: 10_000,
    maxBuffer: 1024 * 1024
});
```

Options are forwarded to Node's corresponding `child_process` method. Common choices include `cwd`, `env`, `encoding`, `timeout`, `signal` for asynchronous calls, `shell`, `maxBuffer`, `killSignal`, and `windowsHide`.

## Promise calls

Use `runPromise()` when the complete buffered output is needed with `await`:

```js
const { stdout, stderr } = await cmd.runPromise('node --version');
```

The Promise rejects when the child cannot start, exits unsuccessfully, times out, is aborted, or exceeds `maxBuffer`. When Node supplies buffered output on the error, it remains available as `error.stdout` and `error.stderr`.

The returned Promise exposes its immediate `ChildProcess` as `.child` when process access is needed before the buffered result settles:

```js
const pending = cmd.runPromise(command, options);
console.log(pending.child.pid);
const result = await pending;
```

`runPromisified` is an alias of `runPromise`, so code written against the earlier proposed name can migrate without another wrapper:

```js
const result = await cmd.runPromisified(command, options);
```

## Direct executable calls

Shell strings remain useful for pipelines, redirection, and platform built-ins. When you only need to start an executable, prefer the direct APIs:

```js
const { stdout } = await cmd.runFilePromise(
    process.execPath,
    ['--version']
);
```

The buffered direct family is:

- `runFile(file, args?, options?, callback?)`
- `runFileSync(file, args?, options?)`
- `runFilePromise(file, args?, options?)`
- `runFilePromisified`, an alias of `runFilePromise`

Direct calls keep arguments separate and do not invoke a shell by default. Supplying `shell: true` intentionally restores shell parsing and its associated quoting and injection risks.

The Promise returned by `runFilePromise()` and its alias also exposes the direct child as `.child`.

For a long-running, high-output, or interactive executable, use the unbuffered stream method:

```js
const child = cmd.runStream(process.execPath, ['--version']);

child.stdout.on('data', (chunk) => process.stdout.write(chunk));
child.stderr.on('data', (chunk) => process.stderr.write(chunk));
```

`runStream(file, args?, options?)` wraps Node's `spawn()`, returns the `ChildProcess`, keeps arguments separate, and avoids a shell by default. Its streams are not collected into a final `{ stdout, stderr }` result. `maxBuffer` and buffered-output `encoding` do not apply; set an encoding on each stream if needed. Setting `options.shell` opts back into shell parsing.

## Process input and cancellation

Continue using the child returned by `run()`, `runFile()`, or `runStream()` for PID access, streams, interactive input, events, and manual termination:

```js
const child = cmd.runStream(process.execPath, ['--interactive']);
child.stdin.write('console.log(42)\n');
child.stdin.write('.exit\n');
child.stdin.end();
```

For asynchronous cancellation, pass an `AbortSignal`:

```js
const controller = new AbortController();
const child = cmd.run(command, { signal: controller.signal }, callback);

controller.abort();
```

Manual `child.kill()` remains available. Shell descendants can outlive their immediate shell parent on some operating systems, so cancellation is not a portable process-tree manager.

## Privileges and administrator access

Version 6 does not perform automatic administrator, root, `sudo`, or UAC elevation. A child inherits the privileges of the Node.js process that launches it. Start the parent process with the deliberately chosen privileges and follow the operating system's normal authorization flow.

## Upgrade checklist

1. Upgrade production and CI runtimes to Node.js 22.12 or newer.
2. Keep existing `run()` and `runSync()` calls unless a new API solves a specific need.
3. Replace hand-written Promise wrappers with `runPromise()`.
4. Replace shell-string interpolation with `runFile*()` or `runStream()` and argument arrays where practical.
5. Use `runStream()` instead of buffered methods for long-running, high-output, or interactive programs.
6. Review `cwd`, inherited `env`, `timeout`, `maxBuffer`, and cancellation for every untrusted or long-running command.
7. Test shell-dependent commands on every supported operating system.
8. Read [SECURITY.md](SECURITY.md) before accepting command or argument data from another user or service.

See the [README](README.md) for the full API and [CHANGELOG.md](CHANGELOG.md) for the complete v6 release notes.
