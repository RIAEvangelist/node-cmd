'use strict';

const {
    exec,
    execFile,
    execFileSync,
    execSync,
    spawn
} = require('node:child_process');
const {promisify} = require('node:util');

const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);

/**
 * Run a command through the platform shell.
 *
 * Supported signatures:
 *   run(command)
 *   run(command, callback)
 *   run(command, options)
 *   run(command, options, callback)
 *
 * @returns {import('node:child_process').ChildProcess}
 */
function run(command, options, callback) {
    if (typeof options === 'function') {
        return exec(command, options);
    }

    if (callback !== undefined) {
        return exec(command, options, callback);
    }

    if (options === undefined) {
        return exec(command);
    }

    return exec(command, options);
}

/**
 * Run a command through the platform shell and resolve its buffered output.
 * The returned promise exposes the immediate ChildProcess as `.child`.
 */
function runPromise(command, options) {
    if (options === undefined) {
        return execPromise(command);
    }

    return execPromise(command, options);
}

/**
 * Run a command synchronously without throwing for an ordinary command error.
 * The legacy `{data, err, stderr}` result envelope is preserved.
 */
function runSync(command, options) {
    return syncResult(() => execSync(command, syncOptions(options)));
}

/**
 * Run an executable directly without a shell and buffer its output.
 *
 * Supported signatures:
 *   runFile(file)
 *   runFile(file, callback)
 *   runFile(file, options, callback)
 *   runFile(file, args, callback)
 *   runFile(file, args, options, callback)
 *
 * @returns {import('node:child_process').ChildProcess}
 */
function runFile(file, args, options, callback) {
    const invocation = fileInvocation(args, options, callback);

    if (invocation.callback !== undefined) {
        return execFile(
            file,
            invocation.args,
            invocation.options,
            invocation.callback
        );
    }

    if (invocation.options !== undefined) {
        return execFile(file, invocation.args, invocation.options);
    }

    return execFile(file, invocation.args);
}

/**
 * Run an executable directly and resolve its buffered output.
 * The returned promise exposes the immediate ChildProcess as `.child`.
 */
function runFilePromise(file, args, options) {
    const invocation = fileInvocation(args, options);

    if (invocation.options === undefined) {
        return execFilePromise(file, invocation.args);
    }

    return execFilePromise(file, invocation.args, invocation.options);
}

/**
 * Run an executable directly and synchronously.
 * The legacy `{data, err, stderr}` result envelope is preserved.
 */
function runFileSync(file, args, options) {
    const invocation = fileInvocation(args, options);

    return syncResult(() => execFileSync(
        file,
        invocation.args,
        syncOptions(invocation.options)
    ));
}

/**
 * Spawn an unbuffered process for long-running, high-output, or interactive work.
 * No shell is used unless `options.shell` is enabled explicitly.
 *
 * @returns {import('node:child_process').ChildProcess}
 */
function runStream(file, args, options) {
    if (!Array.isArray(args)) {
        if (args !== undefined && args !== null) {
            options = args;
        }
        args = [];
    }

    if (options === undefined) {
        return spawn(file, args);
    }

    return spawn(file, args, options);
}

function fileInvocation(args, options, callback) {
    if (typeof args === 'function') {
        return {
            args: [],
            options: undefined,
            callback: args
        };
    }

    if (args === undefined || args === null) {
        return {
            args: [],
            options: typeof options === 'function' ? undefined : options,
            callback: typeof options === 'function' ? options : callback
        };
    }

    if (!Array.isArray(args)) {
        return {
            args: [],
            options: args,
            callback: typeof options === 'function' ? options : callback
        };
    }

    if (typeof options === 'function') {
        return {
            args,
            options: undefined,
            callback: options
        };
    }

    return {args, options, callback};
}

function syncOptions(options) {
    if (options === undefined || options === null) {
        return {
            encoding: 'utf8',
            stdio: 'pipe'
        };
    }

    if (typeof options !== 'object') {
        throw new TypeError('options must be an object when provided');
    }

    return {
        ...options,
        encoding: options.encoding === undefined ? 'utf8' : options.encoding,
        stdio: options.stdio === undefined ? 'pipe' : options.stdio
    };
}

function syncResult(executor) {
    try {
        return {
            data: executor(),
            err: null,
            stderr: null
        };
    } catch (error) {
        const stderr = error && error.stderr !== undefined && error.stderr !== null
            ? error.stderr
            : '';
        const err = hasOutput(stderr)
            ? stderr
            : error instanceof Error
                ? error.message
                : String(error);

        return {
            data: null,
            err,
            stderr
        };
    }
}

function hasOutput(value) {
    if (Buffer.isBuffer(value)) {
        return value.length > 0;
    }

    return String(value).length > 0;
}

const commandline = {
    run,
    runSync,
    runPromise,
    runPromisified: runPromise,
    runFile,
    runFileSync,
    runFilePromise,
    runFilePromisified: runFilePromise,
    runStream
};

module.exports = commandline;
