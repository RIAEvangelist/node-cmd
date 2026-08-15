'use strict';

const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync
} = require('node:fs');
const {tmpdir} = require('node:os');
const {basename, join, resolve, sep} = require('node:path');

const projectRoot = resolve(__dirname, '..');
const prefix = 'node-cmd-package-smoke-';
const npmCli = process.env.npm_execpath;

assert.ok(npmCli, 'Run package smoke through npm so npm_execpath is available.');
assert.ok(existsSync(npmCli), `npm CLI was not found at ${npmCli}.`);

const temporaryRoot = mkdtempSync(join(tmpdir(), prefix));

function run(program, args, options = {}) {
    return execFileSync(program, args, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit'],
        ...options
    });
}

function runNpm(args, options) {
    return run(process.execPath, [npmCli, ...args], options);
}

function removeTemporaryRoot(target) {
    const resolvedTarget = resolve(target);
    const resolvedTemporaryDirectory = `${resolve(tmpdir())}${sep}`;
    const comparableTarget = process.platform === 'win32'
        ? resolvedTarget.toLowerCase()
        : resolvedTarget;
    const comparableTemporaryDirectory = process.platform === 'win32'
        ? resolvedTemporaryDirectory.toLowerCase()
        : resolvedTemporaryDirectory;

    assert.ok(comparableTarget.startsWith(comparableTemporaryDirectory));
    assert.ok(basename(resolvedTarget).startsWith(prefix));

    rmSync(resolvedTarget, {recursive: true, force: true});
}

try {
    const packed = JSON.parse(runNpm([
        'pack',
        '--json',
        '--pack-destination',
        temporaryRoot
    ]));

    assert.equal(packed.length, 1);
    assert.match(packed[0].filename, /^node-cmd-6\.0\.0\.tgz$/);

    const tarball = join(temporaryRoot, packed[0].filename);
    const consumer = join(temporaryRoot, 'consumer');
    mkdirSync(consumer);
    writeFileSync(
        join(consumer, 'package.json'),
        `${JSON.stringify({name: 'node-cmd-smoke', private: true}, null, 2)}\n`
    );

    runNpm([
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        tarball
    ], {cwd: consumer});

    const installed = join(consumer, 'node_modules', 'node-cmd');
    const installedPackage = JSON.parse(readFileSync(
        join(installed, 'package.json'),
        'utf8'
    ));

    assert.equal(installedPackage.version, '6.0.0');
    assert.equal(installedPackage.dependencies, undefined);
    assert.equal(installedPackage.devDependencies, undefined);
    assert.ok(existsSync(join(installed, 'cmd.js')));
    assert.ok(existsSync(join(installed, 'cmd.mjs')));
    assert.ok(existsSync(join(installed, 'README.md')));
    assert.equal(existsSync(join(installed, 'site')), false);
    assert.equal(existsSync(join(installed, 'test')), false);
    assert.equal(existsSync(join(installed, 'scripts')), false);

    run(process.execPath, [
        '-e',
        [
            "const cmd = require('node-cmd');",
            "if (require('node-cmd/cmd') !== cmd || require('node-cmd/cmd.js') !== cmd) process.exit(1);",
            "const result = cmd.runFileSync(process.execPath, ['-e', \"process.stdout.write('commonjs')\"]);",
            "if (result.err || result.data !== 'commonjs') process.exit(1);"
        ].join(' ')
    ], {cwd: consumer});

    run(process.execPath, [
        '--input-type=module',
        '-e',
        [
            "import commandline, {runFilePromise} from 'node-cmd';",
            "const result = await runFilePromise(process.execPath, ['-e', \"process.stdout.write('esm')\"]);",
            "if (commandline.runFilePromise !== runFilePromise || result.stdout !== 'esm') process.exit(1);"
        ].join(' ')
    ], {cwd: consumer});

    process.stdout.write('Packed CommonJS and ESM imports passed.\n');
} finally {
    removeTemporaryRoot(temporaryRoot);
}
