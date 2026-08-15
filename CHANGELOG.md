# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Changed

- Updated tests and native Node coverage from `vanilla-test` 2.0.0 to 2.1.0.
- Removed the unused Chrome coverage configuration now that `vanilla-test` supports target-specific Node-only projects.
- Removed the former third-party coverage and browser packages from the development dependency graph; the test tool now depends only on the author's `ansi-colors-es6` and `strong-type` modules.
- Published the normalized, ANSI-free `test-results.json` artifact alongside the engineer-readable HTML coverage report.
- Added focused overload, explicit-stdio, and non-Error fallback checks, bringing all 2.1 native V8 range metrics and enforced thresholds to 100%.

## [6.0.0] - 2026-08-14

### Added

- Native CommonJS and ES module entry points through conditional package exports.
- Named ES module exports alongside the compatible default API object.
- Optional Node `child_process` options for asynchronous and synchronous command execution.
- `runPromise()` with `runPromisified` as a compatibility alias. Both resolve with `{ stdout, stderr }`.
- Immediate child-process access through `.child` on Promises returned by the Promise APIs.
- `runFile()`, `runFileSync()`, and `runFilePromise()` for direct executable-and-argument execution without a shell by default.
- `runFilePromisified` as an alias of `runFilePromise()`.
- `runStream()` as an unbuffered `spawn()` wrapper for long-running, high-output, and interactive programs. It accepts direct arguments, avoids a shell by default, and returns the `ChildProcess`.
- `AbortSignal`, timeout, working-directory, environment, encoding, shell, `maxBuffer`, kill-signal, and Windows window options where the underlying Node method supports them.
- A 17-case JavaScript suite and native Node coverage powered by the author's `vanilla-test` 2.0.0 module, plus packed-package smoke tests, cross-platform continuous integration, and GitHub Pages deployment.
- A new project site, migration guide, changelog, and security guidance.

### Changed

- Raised the minimum supported Node.js version from 6.4 to 22.12.
- Modernized package metadata while keeping zero runtime dependencies.
- Made `run(command, options?, callback?)` accept either the original callback form or an options object followed by a callback.
- Standardized direct-file callbacks on the same `(error, data, stderr)` shape as `run()`.
- Documented Promise rejection, output buffering, cancellation, process control, shell differences, and privilege inheritance explicitly.

### Compatibility

- `require('node-cmd')` continues to return the familiar API object.
- `run(command, callback)` remains valid and continues to return the `ChildProcess`.
- `runSync(command)` retains the `{ err, data, stderr }` result keys.
- The CommonJS deep paths `require('node-cmd/cmd')` and `require('node-cmd/cmd.js')` remain explicitly exported for consumers that already use them; new code should prefer the package root.
- `runPromisified()` remains available as an alias of `runPromise()`.
- `runFilePromisified()` is an alias of `runFilePromise()`.

### Security

- Added direct executable APIs so callers can keep untrusted values out of shell command strings.
- Clarified that `runStream()` is direct and no-shell by default; opting into `options.shell` restores shell parsing and its risks.
- Clarified that shell execution, environment inheritance, working directories, output capture, timeouts, cancellation, and process privileges remain under the caller's control.

### Removed

- Support for Node.js versions older than 22.12.
