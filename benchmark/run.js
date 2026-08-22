'use strict';

const {
    exec,
    execFile,
    execFileSync,
    execSync,
    spawn
} = require('node:child_process');
const {createHash} = require('node:crypto');
const {mkdirSync, readFileSync, writeFileSync} = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {promisify} = require('node:util');

const cmd = require('../cmd.js');
const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);
const defaultSamples = 30;
const defaultWarmups = 4;

function sha256(filename) {
    return createHash('sha256')
        .update(readFileSync(path.resolve(__dirname, '..', filename)))
        .digest('hex');
}

function option(name, fallback) {
    const index = process.argv.indexOf(name);

    if (index === -1) return fallback;

    const value = process.argv[index + 1];

    if (value === undefined || value.startsWith('--')) {
        throw new TypeError(name + ' requires a value');
    }

    return value;
}

function positiveInteger(value, name) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new TypeError(name + ' must be a positive integer');
    }

    return parsed;
}

const samples = positiveInteger(option('--samples', defaultSamples), 'samples');
const warmups = positiveInteger(option('--warmups', defaultWarmups), 'warmups');
const outputPath = option('--output');
const directArgs = ['-e', ''];
const asyncOptions = {
    encoding: 'utf8',
    windowsHide: true
};
const syncOptions = {
    encoding: 'utf8',
    stdio: 'pipe',
    windowsHide: true
};
const spawnOptions = {
    stdio: 'ignore',
    windowsHide: true
};

function shellArgument(value) {
    if (process.platform === 'win32') {
        return '"' + value + '"';
    }

    return "'" + value.replaceAll("'", "'\"'\"'") + "'";
}

function shellCommand(source) {
    const payload = Buffer.from(source).toString('base64');
    const executable = shellArgument(process.execPath);
    const bootstrap = shellArgument(
        'eval(Buffer.from(\'' + payload + '\',\'base64\').toString())'
    );

    return executable + ' -e ' + bootstrap;
}

const emptyShellCommand = shellCommand('');

function callbackInvocation(start) {
    return new Promise((resolve, reject) => {
        start((error) => error ? reject(error) : resolve());
    });
}

function processInvocation(start) {
    return new Promise((resolve, reject) => {
        const child = start();

        child.once('error', reject);
        child.once('close', (code, signal) => {
            if (code === 0 && signal === null) {
                resolve();
                return;
            }

            reject(new Error('Child exited with code ' + code + ' and signal ' + signal));
        });
    });
}

const scenarios = [
    {
        id: 'run-callback',
        label: 'run · callback',
        nodeApi: 'exec',
        nodeCmdApi: 'run',
        direct: () => callbackInvocation((done) => exec(
            emptyShellCommand,
            asyncOptions,
            done
        )),
        nodeCmd: () => callbackInvocation((done) => cmd.run(
            emptyShellCommand,
            asyncOptions,
            done
        ))
    },
    {
        id: 'run-promise',
        label: 'runPromise',
        nodeApi: 'promisify(exec)',
        nodeCmdApi: 'runPromise',
        direct: () => execPromise(emptyShellCommand, asyncOptions),
        nodeCmd: () => cmd.runPromise(emptyShellCommand, asyncOptions)
    },
    {
        id: 'run-sync',
        label: 'runSync',
        nodeApi: 'execSync',
        nodeCmdApi: 'runSync',
        direct: () => {
            execSync(emptyShellCommand, syncOptions);
        },
        nodeCmd: () => {
            const result = cmd.runSync(emptyShellCommand, syncOptions);

            if (result.err !== null) throw new Error(String(result.err));
        }
    },
    {
        id: 'run-file-callback',
        label: 'runFile · callback',
        nodeApi: 'execFile',
        nodeCmdApi: 'runFile',
        direct: () => callbackInvocation((done) => execFile(
            process.execPath,
            directArgs,
            asyncOptions,
            done
        )),
        nodeCmd: () => callbackInvocation((done) => cmd.runFile(
            process.execPath,
            directArgs,
            asyncOptions,
            done
        ))
    },
    {
        id: 'run-file-promise',
        label: 'runFilePromise',
        nodeApi: 'promisify(execFile)',
        nodeCmdApi: 'runFilePromise',
        direct: () => execFilePromise(process.execPath, directArgs, asyncOptions),
        nodeCmd: () => cmd.runFilePromise(process.execPath, directArgs, asyncOptions)
    },
    {
        id: 'run-file-sync',
        label: 'runFileSync',
        nodeApi: 'execFileSync',
        nodeCmdApi: 'runFileSync',
        direct: () => {
            execFileSync(process.execPath, directArgs, syncOptions);
        },
        nodeCmd: () => {
            const result = cmd.runFileSync(process.execPath, directArgs, syncOptions);

            if (result.err !== null) throw new Error(String(result.err));
        }
    },
    {
        id: 'run-stream',
        label: 'runStream',
        nodeApi: 'spawn',
        nodeCmdApi: 'runStream',
        direct: () => processInvocation(() => spawn(
            process.execPath,
            directArgs,
            spawnOptions
        )),
        nodeCmd: () => processInvocation(() => cmd.runStream(
            process.execPath,
            directArgs,
            spawnOptions
        ))
    }
];

async function duration(callback) {
    const startedAt = process.hrtime.bigint();

    await callback();

    return Number(process.hrtime.bigint() - startedAt) / 1e6;
}

function percentile(sorted, fraction) {
    return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

function statistics(values) {
    const sorted = [...values].sort((left, right) => left - right);
    const median = percentile(sorted, .5);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce(
        (sum, value) => sum + ((value - average) ** 2),
        0
    ) / values.length;

    const deviations = values
        .map((value) => Math.abs(value - median))
        .sort((left, right) => left - right);

    return {
        minMs: sorted[0],
        p25Ms: percentile(sorted, .25),
        p50Ms: median,
        p75Ms: percentile(sorted, .75),
        p95Ms: percentile(sorted, .95),
        maxMs: sorted[sorted.length - 1],
        averageMs: average,
        medianAbsoluteDeviationMs: percentile(deviations, .5),
        standardDeviationMs: Math.sqrt(variance)
    };
}

function seedFrom(value) {
    let seed = 2166136261;

    for (const character of value) {
        seed ^= character.codePointAt(0);
        seed = Math.imul(seed, 16777619);
    }

    return seed >>> 0;
}

function random(seed) {
    let state = seed;

    return () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function bootstrapMedianCi(values, seed, iterations = 2_000) {
    const next = random(seed);
    const medians = [];

    for (let iteration = 0; iteration < iterations; iteration++) {
        const sample = [];

        for (let index = 0; index < values.length; index++) {
            sample.push(values[Math.floor(next() * values.length)]);
        }

        sample.sort((left, right) => left - right);
        medians.push(percentile(sample, .5));
    }

    medians.sort((left, right) => left - right);

    return [
        percentile(medians, .025),
        percentile(medians, .975)
    ];
}

async function exercisePair(scenario) {
    for (let index = 0; index < warmups; index++) {
        if (index % 2 === 0) {
            await scenario.direct();
            await scenario.nodeCmd();
        } else {
            await scenario.nodeCmd();
            await scenario.direct();
        }
    }

    const direct = [];
    const nodeCmd = [];
    const pairedDelta = [];
    const rawSamples = [];

    for (let index = 0; index < samples; index++) {
        let directDuration;
        let nodeCmdDuration;

        if (index % 2 === 0) {
            directDuration = await duration(scenario.direct);
            nodeCmdDuration = await duration(scenario.nodeCmd);
        } else {
            nodeCmdDuration = await duration(scenario.nodeCmd);
            directDuration = await duration(scenario.direct);
        }

        direct.push(directDuration);
        nodeCmd.push(nodeCmdDuration);
        pairedDelta.push(nodeCmdDuration - directDuration);
        rawSamples.push({
            pair: index + 1,
            order: index % 2 === 0
                ? ['node:child_process', 'node-cmd']
                : ['node-cmd', 'node:child_process'],
            directMs: directDuration,
            nodeCmdMs: nodeCmdDuration,
            deltaMs: nodeCmdDuration - directDuration
        });
    }

    const directStats = statistics(direct);
    const nodeCmdStats = statistics(nodeCmd);
    const deltaStats = statistics(pairedDelta);

    return {
        id: scenario.id,
        label: scenario.label,
        nodeApi: scenario.nodeApi,
        nodeCmdApi: scenario.nodeCmdApi,
        direct: directStats,
        nodeCmd: nodeCmdStats,
        pairedDelta: {
            ...deltaStats,
            p50Percent: (deltaStats.p50Ms / directStats.p50Ms) * 100,
            medianCi95Ms: bootstrapMedianCi(
                pairedDelta,
                seedFrom(scenario.id + ':process')
            )
        },
        samples: rawSamples
    };
}

function dispatchSubject() {
    const childProcess = require('node:child_process');
    const modulePath = require.resolve('../cmd.js');
    const cachedModule = require.cache[modulePath];
    const originals = {};
    let executed = false;
    let token = 0;

    function stub() {
        executed = true;
        token = (token + 1) & 1023;

        return token;
    }

    const stubs = {
        exec: stub,
        execFile: stub,
        execFileSync: stub,
        execSync: stub,
        spawn: stub
    };
    const promisedExec = function promisedExec() {
        return stub();
    };
    const promisedExecFile = function promisedExecFile() {
        return stub();
    };

    stubs.exec[promisify.custom] = promisedExec;
    stubs.execFile[promisify.custom] = promisedExecFile;

    for (const name of Object.keys(stubs)) {
        originals[name] = childProcess[name];
    }

    let subject;
    const installed = [];

    try {
        for (const [name, replacement] of Object.entries(stubs)) {
            childProcess[name] = replacement;
            installed.push(name);
        }

        delete require.cache[modulePath];
        subject = require(modulePath);
    } finally {
        for (const name of installed) {
            childProcess[name] = originals[name];
        }
        delete require.cache[modulePath];
        if (cachedModule) require.cache[modulePath] = cachedModule;
    }

    const callback = () => {};
    const options = {encoding: 'utf8', stdio: 'pipe'};
    const args = ['argument'];

    return {
        executed: () => executed,
        scenarios: [
            {
                id: 'run',
                label: 'run',
                direct: () => stubs.exec('command', options, callback),
                nodeCmd: () => subject.run('command', options, callback)
            },
            {
                id: 'run-promise',
                label: 'runPromise',
                direct: () => promisedExec('command', options),
                nodeCmd: () => subject.runPromise('command', options)
            },
            {
                id: 'run-sync',
                label: 'runSync',
                direct: () => stubs.execSync('command', options),
                nodeCmd: () => subject.runSync('command', options).data
            },
            {
                id: 'run-file',
                label: 'runFile',
                direct: () => stubs.execFile('file', args, options, callback),
                nodeCmd: () => subject.runFile('file', args, options, callback)
            },
            {
                id: 'run-file-promise',
                label: 'runFilePromise',
                direct: () => promisedExecFile('file', args, options),
                nodeCmd: () => subject.runFilePromise('file', args, options)
            },
            {
                id: 'run-file-sync',
                label: 'runFileSync',
                direct: () => stubs.execFileSync('file', args, options),
                nodeCmd: () => subject.runFileSync('file', args, options).data
            },
            {
                id: 'run-stream',
                label: 'runStream',
                direct: () => stubs.spawn('file', args, options),
                nodeCmd: () => subject.runStream('file', args, options)
            }
        ]
    };
}

let dispatchChecksum = 1;

function dispatchBatch(callback, iterations) {
    let checksum = 1;
    const startedAt = process.hrtime.bigint();

    for (let index = 0; index < iterations; index++) {
        checksum = (checksum + callback()) >>> 0;
    }

    const elapsedNs = Number(process.hrtime.bigint() - startedAt);
    dispatchChecksum = (dispatchChecksum + checksum) >>> 0;

    return {
        elapsedNs,
        nsPerCall: elapsedNs / iterations
    };
}

function dispatchStatistics(values) {
    const result = statistics(values);

    return Object.fromEntries(
        Object.entries(result).map(([name, value]) => [
            name.replace('Ms', 'Ns'),
            value
        ])
    );
}

function calibrateDispatch(scenario) {
    let iterations = 100_000;

    while (iterations < 2_000_000) {
        const direct = dispatchBatch(scenario.direct, iterations);
        const nodeCmd = dispatchBatch(scenario.nodeCmd, iterations);

        if (direct.elapsedNs >= 20_000_000 || nodeCmd.elapsedNs >= 20_000_000) {
            break;
        }

        iterations *= 2;
    }

    return Math.min(iterations, 2_000_000);
}

function exerciseDispatchPair(scenario) {
    const iterations = calibrateDispatch(scenario);

    for (let index = 0; index < warmups; index++) {
        if (index % 2 === 0) {
            dispatchBatch(scenario.direct, iterations);
            dispatchBatch(scenario.nodeCmd, iterations);
        } else {
            dispatchBatch(scenario.nodeCmd, iterations);
            dispatchBatch(scenario.direct, iterations);
        }
    }

    const direct = [];
    const nodeCmd = [];
    const pairedDelta = [];
    const rawSamples = [];

    for (let index = 0; index < samples; index++) {
        let directDuration;
        let nodeCmdDuration;

        if (index % 2 === 0) {
            directDuration = dispatchBatch(scenario.direct, iterations).nsPerCall;
            nodeCmdDuration = dispatchBatch(scenario.nodeCmd, iterations).nsPerCall;
        } else {
            nodeCmdDuration = dispatchBatch(scenario.nodeCmd, iterations).nsPerCall;
            directDuration = dispatchBatch(scenario.direct, iterations).nsPerCall;
        }

        direct.push(directDuration);
        nodeCmd.push(nodeCmdDuration);
        pairedDelta.push(nodeCmdDuration - directDuration);
        rawSamples.push({
            batch: index + 1,
            order: index % 2 === 0
                ? ['node:child_process', 'node-cmd']
                : ['node-cmd', 'node:child_process'],
            iterations,
            directNs: directDuration,
            nodeCmdNs: nodeCmdDuration,
            deltaNs: nodeCmdDuration - directDuration
        });
    }

    const directStats = dispatchStatistics(direct);
    const nodeCmdStats = dispatchStatistics(nodeCmd);
    const deltaStats = dispatchStatistics(pairedDelta);

    return {
        id: scenario.id,
        label: scenario.label,
        iterationsPerBatch: iterations,
        direct: directStats,
        nodeCmd: nodeCmdStats,
        pairedDelta: {
            ...deltaStats,
            p50Percent: (deltaStats.p50Ns / directStats.p50Ns) * 100,
            medianCi95Ns: bootstrapMedianCi(
                pairedDelta,
                seedFrom(scenario.id + ':dispatch')
            )
        },
        samples: rawSamples
    };
}

function compactNumber(value) {
    return Number(value.toFixed(3));
}

function compactResult(result) {
    return JSON.parse(JSON.stringify(result, (key, value) => (
        typeof value === 'number' ? compactNumber(value) : value
    )));
}

function printReport(report) {
    const heading = [
        'Scenario'.padEnd(24),
        'Node p50'.padStart(10),
        'node-cmd'.padStart(10),
        'paired Δ'.padStart(10)
    ].join('  ');

    process.stdout.write('\nnode-cmd process-launch benchmark\n');
    process.stdout.write(heading + '\n');
    process.stdout.write('-'.repeat(heading.length) + '\n');

    for (const result of report.results) {
        process.stdout.write([
            result.label.padEnd(24),
            (result.direct.p50Ms.toFixed(3) + ' ms').padStart(10),
            (result.nodeCmd.p50Ms.toFixed(3) + ' ms').padStart(10),
            ((result.pairedDelta.p50Ms >= 0 ? '+' : '') +
                result.pairedDelta.p50Ms.toFixed(3) + ' ms').padStart(10)
        ].join('  ') + '\n');
    }

    process.stdout.write('\n');
    process.stdout.write(
        report.samplesPerImplementation + ' measured launches per implementation after ' +
        report.warmupsPerImplementation + ' warmups; order alternates each sample.\n'
    );
    process.stdout.write(
        'Reference environment: Node ' + report.environment.node +
        ', ' + report.environment.platform + ' ' + report.environment.arch + '.\n'
    );
    process.stdout.write(
        'Interpretation: process creation dominates; small positive or negative deltas are normal host noise.\n'
    );

    process.stdout.write('\nJavaScript dispatch benchmark — no process started\n');
    const dispatchHeading = [
        'API'.padEnd(24),
        'Node p50'.padStart(10),
        'node-cmd'.padStart(10),
        'added'.padStart(10)
    ].join('  ');

    process.stdout.write(dispatchHeading + '\n');
    process.stdout.write('-'.repeat(dispatchHeading.length) + '\n');

    for (const result of report.dispatchResults) {
        process.stdout.write([
            result.label.padEnd(24),
            (result.direct.p50Ns.toFixed(2) + ' ns').padStart(10),
            (result.nodeCmd.p50Ns.toFixed(2) + ' ns').padStart(10),
            ((result.pairedDelta.p50Ns >= 0 ? '+' : '') +
                result.pairedDelta.p50Ns.toFixed(2) + ' ns').padStart(10)
        ].join('  ') + '\n');
    }

    process.stdout.write('\nDispatch checksum: ' + report.dispatchChecksum + '\n');
}

async function main() {
    const results = [];
    const dispatch = dispatchSubject();
    const dispatchResults = [];

    const imported = await import('../cmd.mjs');

    if (
        imported.default !== cmd ||
        Object.keys(cmd).some((name) => imported[name] !== cmd[name])
    ) {
        throw new Error('CommonJS and ESM do not share the same implementations');
    }

    for (const scenario of scenarios) {
        process.stdout.write('Measuring ' + scenario.label + '...\n');
        results.push(compactResult(await exercisePair(scenario)));
    }

    for (const scenario of dispatch.scenarios) {
        process.stdout.write('Measuring dispatch for ' + scenario.label + '...\n');
        dispatchResults.push(compactResult(exerciseDispatchPair(scenario)));
    }

    if (!dispatch.executed() || dispatchChecksum === 0) {
        throw new Error('Dispatch benchmark was optimized away or did not execute');
    }

    const cpu = os.cpus()[0];
    const report = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        subject: 'Empty Node.js child process launch latency',
        unit: 'milliseconds',
        lowerIsBetter: true,
        samplesPerImplementation: samples,
        warmupsPerImplementation: warmups,
        source: {
            package: 'node-cmd@' + require('../package.json').version,
            runtimeFiles: {
                'cmd.js': sha256('cmd.js'),
                'cmd.mjs': sha256('cmd.mjs')
            },
            benchmarkFiles: {
                'benchmark/run.js': sha256('benchmark/run.js'),
                'benchmark/render-chart.js': sha256('benchmark/render-chart.js')
            }
        },
        environment: {
            node: process.version,
            v8: process.versions.v8,
            platform: os.platform(),
            release: os.release(),
            arch: os.arch(),
            cpu: cpu ? cpu.model.trim() : 'unknown',
            logicalCpuCount: os.cpus().length
        },
        methodology: {
            child: 'The current Node executable starts with an empty -e program.',
            processShapes: 'run* starts the platform shell plus the empty Node child; runFile* and runStream start the empty Node child directly.',
            pairing: 'Node direct and node-cmd launches run sequentially; first position alternates each sample.',
            interpretation: 'node-cmd delegates to node:child_process. Differences near scheduler variation are not evidence that either wrapper makes the operating system launch a process faster.'
        },
        results,
        dispatch: {
            subject: 'JavaScript wrapper dispatch with node:child_process replaced by counter stubs',
            unit: 'nanoseconds per call',
            processStarted: false,
            calibration: 'Each API uses at least 100,000 calls per measured batch and calibrates up to 2,000,000.',
            interpretation: 'This isolates JavaScript overload normalization, options handling, and result envelopes from operating-system process cost.'
        },
        dispatchChecksum,
        dispatchResults
    };

    if (outputPath) {
        const resolved = path.resolve(outputPath);

        mkdirSync(path.dirname(resolved), {recursive: true});
        writeFileSync(resolved, JSON.stringify(report, null, 2) + '\n');
        process.stdout.write('Wrote ' + resolved + '\n');
    }

    printReport(report);
}

main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
});
