[![node-cmd — command-line and process control for JavaScript](https://raw.githubusercontent.com/RIAEvangelist/node-cmd/main/assets/node-cmd-header.png)](https://riaevangelist.github.io/node-cmd/)

# node-cmd

[Visit the node-cmd GitHub.io site](https://riaevangelist.github.io/node-cmd/)

[API reference](https://riaevangelist.github.io/node-cmd/api.html) · [Testing & coverage](https://riaevangelist.github.io/node-cmd/testing.html) · [Security](https://riaevangelist.github.io/node-cmd/security.html) · [Migration](https://riaevangelist.github.io/node-cmd/migration.html) · [Changelog](https://riaevangelist.github.io/node-cmd/changelog.html)

[![CI](https://github.com/RIAEvangelist/node-cmd/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/RIAEvangelist/node-cmd/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/node-cmd.svg)](https://www.npmjs.com/package/node-cmd)
[![npm downloads](https://img.shields.io/npm/dm/node-cmd.svg)](https://www.npmjs.com/package/node-cmd)
[![license](https://img.shields.io/github/license/RIAEvangelist/node-cmd.svg)](licence)
[![Node.js >=22.12](https://img.shields.io/badge/Node.js-%3E%3D22.12-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![runtime dependencies](https://img.shields.io/badge/runtime_dependencies-0-2ea44f)](package.json)
[![tests](https://img.shields.io/badge/tests-vanilla--test%202.1.0-16d9e3)](https://riaevangelist.github.io/node-cmd/testing.html)
[![coverage](https://img.shields.io/badge/coverage-100%25%20statements-2ea44f)](https://riaevangelist.github.io/node-cmd/coverage/)

[![Sponsor RIAEvangelist](https://img.shields.io/static/v1?label=Sponsor%20RIAEvangelist&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/RIAEvangelist)

**Command-line power for JavaScript.** Run shell commands, launch executables, stream output, write to stdin, and control child processes from Node.js. `node-cmd` has zero runtime dependencies and supports both CommonJS and native ES modules.

The original `run()` and `runSync()` APIs remain available. Version 6 adds forwarded execution options, Promise APIs, direct executable APIs that avoid a shell by default, an unbuffered `spawn` wrapper, and explicit cancellation support.

## Install

```sh
npm install node-cmd
```

node-cmd 6 requires Node.js 22.12 or newer.

## Quick start

### CommonJS

```js
const cmd = require('node-cmd');

cmd.run('node --version', (error, data, stderr) => {
    if (error) {
        console.error(stderr || error.message);
        return;
    }

    console.log(data);
});
```

### ES modules

```js
import { runPromise } from 'node-cmd';

const { stdout, stderr } = await runPromise('node --version');

if (stderr) {
    console.error(stderr);
}

console.log(stdout);
```

### Run an executable without a shell

```js
import { runFilePromise } from 'node-cmd';

const { stdout } = await runFilePromise(
    process.execPath,
    ['--version']
);

console.log(stdout);
```

`runFile*()` keeps the executable and its arguments separate and does not start a shell by default. Prefer it when any argument may contain untrusted or variable data.

## API

| Method | Signature | Returns |
|---|---|---|
| `run` | `run(command, options?, callback?)` | `ChildProcess` |
| `runSync` | `runSync(command, options?)` | `{ err, data, stderr }` |
| `runPromise` | `runPromise(command, options?)` | `Promise<{ stdout, stderr }>` |
| `runPromisified` | Alias of `runPromise` | `Promise<{ stdout, stderr }>` |
| `runFile` | `runFile(file, args?, options?, callback?)` | `ChildProcess` |
| `runFileSync` | `runFileSync(file, args?, options?)` | `{ err, data, stderr }` |
| `runFilePromise` | `runFilePromise(file, args?, options?)` | `Promise<{ stdout, stderr }>` |
| `runFilePromisified` | Alias of `runFilePromise` | `Promise<{ stdout, stderr }>` |
| `runStream` | `runStream(file, args?, options?)` | `ChildProcess` |

The default export and CommonJS export expose the same methods. Native ESM also provides named exports.

### `run(command, options?, callback?)`

Runs a command through the platform shell. The callback keeps the established Node-style shape:

```js
cmd.run(
    'node --version',
    { cwd: process.cwd(), timeout: 10_000 },
    (error, data, stderr) => {
        if (error) {
            console.error(error);
            return;
        }

        console.log(data);
    }
);
```

The options object is optional, so existing `run(command, callback)` calls continue to work. The returned `ChildProcess` is available whether or not a callback is supplied.

### `runPromise(command, options?)`

Runs a shell command and resolves with its buffered output:

```js
const { stdout, stderr } = await cmd.runPromise('node --version', {
    timeout: 10_000
});
```

It rejects when the command cannot start, exits unsuccessfully, times out, is aborted, or exceeds `maxBuffer`. Rejection errors retain Node's child-process details, including `stdout` and `stderr` when Node provides them.

The returned Promise also exposes its immediate `ChildProcess` as `.child` when PID, events, or cancellation are needed before the buffered result settles:

```js
const pending = cmd.runPromise('node --version');
console.log(pending.child.pid);
const result = await pending;
```

`runPromisified` is an exact compatibility alias of `runPromise`.

### `runSync(command, options?)`

Runs a shell command synchronously and preserves the established result keys:

```js
const result = cmd.runSync('node --version');

if (result.err) {
    console.error(result.stderr || result.err);
} else {
    console.log(result.data);
}
```

- `data` contains standard output on success and is `null` on ordinary command failure.
- `err` is `null` on success and describes an ordinary command failure.
- `stderr` contains captured standard error when available.

Use synchronous execution only when blocking the Node.js event loop is acceptable.

### Direct executable methods

The `runFile*()` methods execute a file with an argument array and buffer its output. Their callback, Promise, and synchronous result shapes match the corresponding shell-command methods.

```js
cmd.runFile(
    process.execPath,
    ['--version'],
    { timeout: 10_000 },
    (error, data, stderr) => {
        if (error) {
            console.error(stderr || error.message);
            return;
        }

        console.log(data);
    }
);
```

`runFilePromisified` is an exact compatibility alias of `runFilePromise`.

The Promise returned by `runFilePromise()` or its alias likewise exposes the direct child as `.child`.

### `runStream(file, args?, options?)`

Wraps Node's `spawn()` for long-running, high-output, or interactive programs. It does not buffer complete stdout or stderr and returns the `ChildProcess` immediately.

```js
import { runStream } from 'node-cmd';

const child = runStream(process.execPath, ['--version']);

child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk) => process.stdout.write(chunk));
child.stderr.on('data', (chunk) => process.stderr.write(chunk));
child.on('close', (code, signal) => {
    console.log({ code, signal });
});
```

Arguments remain separate and no shell is used by default. Set `options.shell` only when shell parsing is intentional; doing so reintroduces platform-specific quoting and injection risks.

## Options

Execution options are forwarded to Node's `child_process` APIs. Common options include:

| Option | Purpose |
|---|---|
| `cwd` | Working directory for the child process |
| `env` | Environment variables supplied to the child process |
| `encoding` | Buffered-output encoding; use `'buffer'` or `null` for buffers |
| `timeout` | Milliseconds before Node requests child termination |
| `signal` | `AbortSignal` for asynchronous cancellation |
| `shell` | Shell executable or shell enablement where supported |
| `maxBuffer` | Maximum buffered stdout or stderr before termination |
| `killSignal` | Signal used for timeout or cancellation |
| `windowsHide` | Hide the subprocess window on Windows |

Not every Node option applies to every method. Synchronous calls cannot be cancelled with an `AbortSignal`, and `runStream()` is unbuffered so `encoding` and `maxBuffer` do not apply to it. Set an encoding directly on its stdout or stderr stream when text is wanted.

Setting `shell: true` on a direct-file or streaming call reintroduces shell parsing and its injection risks.

## Child process control

`run()`, `runFile()`, and `runStream()` return Node's `ChildProcess`. Use it for streaming output, interactive input, PID inspection, events, and manual termination. Prefer `runStream()` when output can be large or the process is expected to stay open.

```js
const child = cmd.runStream(process.execPath, ['--version']);

console.log(child.pid);
child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk) => process.stdout.write(chunk));
child.stderr.on('data', (chunk) => process.stderr.write(chunk));
```

### Interactive input

```js
const child = cmd.runStream(process.execPath, ['--interactive']);

child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk) => process.stdout.write(chunk));

child.stdin.write('console.log(6 * 7)\n');
child.stdin.write('.exit\n');
child.stdin.end();
```

Write to the returned child's `stdin`; callback output values are completed buffers, not process handles.

### Cancellation

```js
const controller = new AbortController();

cmd.run(
    'long-running-command',
    { signal: controller.signal },
    (error) => {
        if (error?.name === 'AbortError') {
            console.log('Command cancelled');
        }
    }
);

controller.abort();
```

You can also retain the returned child and call `child.kill()`. A shell command may create descendant processes; terminating the shell does not guarantee that every descendant is terminated on every operating system.

A timeout or kill signal requests termination; it is not a guaranteed hard deadline or a portable process-tree boundary.

## Shell safety

`run()` and `runPromise()` intentionally execute shell command strings. Never concatenate untrusted input into those strings:

```js
// Unsafe: userValue can change the command interpreted by the shell.
cmd.run(`tool --name ${userValue}`);

// Safer: the value remains one executable argument.
cmd.runFile('tool', ['--name', userValue]);
```

`runFile*()` and `runStream()` reduce shell-injection risk when their default no-shell behavior is preserved, but the called executable can still interpret arguments in unsafe ways. Validate inputs and use the smallest necessary environment and working directory. See [SECURITY.md](SECURITY.md) before running commands influenced by another user or service.

## Cross-platform behavior

Shell syntax is platform-specific. Shell commands normally use `/bin/sh` on Unix-like systems and `ComSpec` on Windows, so quoting, environment expansion, separators, and built-in commands differ.

Prefer `runFile*()` or `runStream()` for portable executable calls. Windows `.bat` and `.cmd` files require a command shell; use `run()` or opt into a shell deliberately when invoking them.

`node-cmd` does not request administrator, root, or UAC elevation. Child processes inherit the privileges of the Node.js process that starts them.

## Testing and coverage

The project uses [`vanilla-test` 2.1.0](https://github.com/RIAEvangelist/vanilla-test) for both test execution and Node coverage. It is the only direct development dependency; the published `node-cmd` package keeps zero runtime dependencies.

The JavaScript suite contains 48 focused, non-overlapping cases. Each behavior is represented once and assigned to the set that best describes the contract it protects.

| Test set | Cases | Focus |
| --- | ---: | --- |
| Unit | 5 | CommonJS and ESM surface plus compatibility aliases |
| Functional | 17 | Normal callback, Promise, synchronous, direct-file, and streaming behavior |
| Integration | 8 | Process I/O, environment, cancellation, stderr isolation, and literal arguments |
| Regression | 18 | Overloads, omitted values, buffers, validation, and error normalization |
| **Total** | **48** | **Every public execution path and compatibility edge** |

| Gate | Current result | Required |
| --- | ---: | ---: |
| Behavioral tests | 48 / 48 passing | All passing |
| Statements | 100% | 100% |
| Branches | 100% | 100% |
| Functions | 100% | 100% |
| Lines | 100% | 100% |

Continuous integration runs the suite on Node.js 22.12 and Node.js 24 across Linux, macOS, and Windows. Coverage runs through `vanilla-test coverage node`, using native V8 execution without transforming `node-cmd` source. The generated engineer-readable [HTML coverage report](https://riaevangelist.github.io/node-cmd/coverage/) and ANSI-free [test result artifact](https://riaevangelist.github.io/node-cmd/coverage/test-results.json) are published with the documentation site.

## Development

```sh
npm ci
npm test
npm run test:unit
npm run test:functional
npm run test:integration
npm run test:regression
npm run coverage
npm run test:package
```

The four `test:*` commands run one set independently; `npm test` and `npm run coverage` always run all 48 cases. Coverage writes the local HTML report to `coverage/node/index.html`. `npm run verify` runs the full suite, coverage gates, packed-package smoke test, and static-site validation together.

When upgrading from v5, read [MIGRATION.md](MIGRATION.md). Release details are in [CHANGELOG.md](CHANGELOG.md), and command-execution guidance is in [SECURITY.md](SECURITY.md).

## License

[MIT](licence)
