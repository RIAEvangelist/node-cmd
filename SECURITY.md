# Security

## Reporting a vulnerability

Report suspected vulnerabilities privately through [GitHub Security Advisories](https://github.com/RIAEvangelist/node-cmd/security/advisories/new). Include the affected version, operating system, Node.js version, execution method, options, proof of concept, impact, and any known workaround.

Do not open a public issue with exploit details before the report has been reviewed.

## Security model

`node-cmd` starts operating-system processes. It is not a command sanitizer, privilege boundary, sandbox, process-tree supervisor, secret store, or authorization system. The caller is responsible for deciding which program may run, which arguments it receives, where it runs, what environment it inherits, and how its output is handled.

## Shell command strings

`run()`, `runPromise()`, and `runSync()` execute command strings through a shell. Shell metacharacters, substitutions, quoting, redirection, pipelines, and command separators are interpreted by that shell.

Never concatenate untrusted data into a command string:

```js
// Unsafe: userValue can add another shell operation.
cmd.run(`tool --name ${userValue}`);
```

Escaping shell text correctly is platform- and shell-specific. A small replacement function is not a reliable security boundary.

## Prefer direct executable arguments

Use `runFile()`, `runFilePromise()`, `runFileSync()`, or `runStream()` when shell features are unnecessary:

```js
await cmd.runFilePromise('tool', ['--name', userValue]);
```

This keeps `userValue` as one executable argument and avoids shell parsing by default. It does not make every executable safe: programs may interpret option-like values, response files, paths, configuration files, or scripts themselves. Validate inputs against the called program's contract.

`runStream()` has the same direct-argument, no-shell default while leaving output unbuffered for long-running, high-output, or interactive programs.

Setting `shell: true` on a direct-file or streaming call reintroduces shell parsing and must receive the same review as `run()`.

## Privileges, environment, and working directory

Child processes inherit the privileges of the parent Node.js process. `node-cmd` does not request or bypass administrator, root, `sudo`, UAC, credential, or policy approval. Run the parent with the least privilege required.

By default, children also inherit the parent's environment and current working directory. Before running code influenced by another user or service:

- set `cwd` to an explicit, trusted directory;
- pass a minimal `env` object instead of every parent variable when practical;
- use absolute executable paths for security-sensitive programs;
- do not let untrusted input select the executable, shell, working directory, or environment-variable names; and
- review `PATH`, shell startup behavior, aliases, executable search order, and platform-specific file associations.

## Secrets and output

Command strings and argument lists may be visible in logs, diagnostics, process listings, crash reports, or monitoring tools. Do not place passwords, tokens, private keys, or authentication codes in a command when a safer input channel is available.

Treat stdout and stderr as untrusted data. They may contain secrets, terminal control sequences, malformed text, or attacker-controlled content. Avoid logging them indiscriminately, sanitize them before rendering into HTML or a terminal UI, and limit who can read stored output.

Environment variables and stdin can also expose secrets through the child or its descendants. Use them deliberately and clear retained values when the surrounding application no longer needs them.

## Timeouts, cancellation, and resource limits

Long-running or hostile children can consume CPU, memory, file descriptors, disk space, and output buffers. Set limits appropriate to the command:

```js
const controller = new AbortController();

cmd.runFile('tool', ['--check'], {
    signal: controller.signal,
    timeout: 30_000,
    maxBuffer: 1024 * 1024
}, callback);
```

- Use `timeout` to request child termination after an execution interval.
- Use an `AbortSignal` when the surrounding request or job can be cancelled.
- Set `maxBuffer` high enough for valid buffered output but low enough to bound memory use.
- Use `runStream()` when output may be large and consume its stdout and stderr streams continuously.
- Listen for callback errors, Promise rejections, child `error`, and child `close` events.
- Close stdin when no more input is expected.

Killing an immediate child or aborting a shell does not guarantee that all descendant processes stop on every operating system. If complete process-tree containment is required, use operating-system facilities designed for that purpose.

A timeout is not a guaranteed hard deadline: Node sends the configured kill signal after the interval, but the process may ignore or delay termination, and descendants may remain alive.

Synchronous methods block the Node.js event loop until the command exits or reaches its timeout. Do not use them on an untrusted request path.

## Cross-platform review

The default shell and its syntax differ between Windows and Unix-like systems. A command safe under one parser may behave differently under another. Test security-sensitive behavior on every supported platform, or avoid shell parsing with the direct executable methods.

Windows `.bat` and `.cmd` files require shell interpretation. Treat values passed to them as shell-sensitive even when the surrounding application normally uses direct executable APIs.
