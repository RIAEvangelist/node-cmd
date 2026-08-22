'use strict';

const {mkdirSync, readFileSync, writeFileSync} = require('node:fs');
const path = require('node:path');

const input = path.resolve(process.argv[2] || './benchmark/reference.json');
const outputDirectory = path.resolve(process.argv[3] || './assets');
const report = JSON.parse(readFileSync(input, 'utf8'));

function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function number(value, digits = 2) {
    const rounded = Number(Number(value).toFixed(digits));

    return (Object.is(rounded, -0) ? 0 : rounded).toFixed(digits);
}

function writeChart(name, lines) {
    const output = path.resolve(outputDirectory, name);

    mkdirSync(path.dirname(output), {recursive: true});
    writeFileSync(output, lines.join('\n') + '\n');
    process.stdout.write('Rendered ' + output + '\n');
}

function processChart() {
    const width = 1200;
    const left = 312;
    const right = 110;
    const plotWidth = width - left - right;
    const header = 188;
    const rowHeight = 84;
    const footer = 126;
    const height = header + (report.results.length * rowHeight) + footer;
    const maximum = Math.max(
        ...report.results.flatMap((result) => [
            result.direct.p75Ms,
            result.nodeCmd.p75Ms
        ])
    ) * 1.12;
    const x = (value) => left + ((value / maximum) * plotWidth);
    const barWidth = (value) => Math.max(2, x(value) - left);
    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="title description">',
        '<title id="title">node-cmd versus direct Node process-launch latency</title>',
        '<desc id="description">Seven paired benchmark comparisons show node-cmd process completion latency tracking direct node:child_process latency within ordinary host variation. Bars show medians and whiskers show interquartile ranges.</desc>',
        '<rect width="1200" height="' + height + '" rx="28" fill="#060b16"/>',
        '<text x="56" y="70" fill="#45e8ff" font-family="Consolas, monospace" font-size="17" font-weight="700" letter-spacing="2">NODE-CMD / END-TO-END PROCESS BENCHMARK</text>',
        '<text x="56" y="120" fill="#f1f7ff" font-family="Segoe UI, sans-serif" font-size="38" font-weight="800">The process is the work.</text>',
        '<text x="56" y="154" fill="#9baabd" font-family="Segoe UI, sans-serif" font-size="19">Empty Node child · median completion latency · IQR whiskers · lower is better</text>'
    ];

    for (let tick = 0; tick <= 4; tick++) {
        const tickX = left + ((plotWidth / 4) * tick);
        const value = (maximum / 4) * tick;

        lines.push(
            '<line x1="' + tickX + '" y1="' + (header - 18) + '" x2="' + tickX +
            '" y2="' + (height - footer + 12) + '" stroke="#18263a" stroke-width="1"/>',
            '<text x="' + tickX + '" y="' + (header - 30) + '" text-anchor="middle" fill="#9baabd" font-family="Consolas, monospace" font-size="13">' +
            number(value, 0) + ' ms</text>'
        );
    }

    report.results.forEach((result, index) => {
        const top = header + (index * rowHeight);
        const directY = top + 15;
        const wrapperY = top + 45;
        const delta = result.pairedDelta.p50Ms;
        const deltaCi = result.pairedDelta.medianCi95Ms;
        const deltaLabel = (delta >= 0 ? '+' : '') + number(delta, 2) + ' ms Δ · CI ' +
            number(deltaCi[0], 2) + '…' + number(deltaCi[1], 2);

        lines.push(
            '<text x="56" y="' + (top + 29) + '" fill="#f1f7ff" font-family="Segoe UI, sans-serif" font-size="18" font-weight="700">' +
            escapeXml(result.label) + '</text>',
            '<text x="56" y="' + (top + 54) + '" fill="#9baabd" font-family="Consolas, monospace" font-size="12">' +
            escapeXml(result.nodeApi + ' → ' + result.nodeCmdApi) + '</text>',
            '<rect x="' + left + '" y="' + directY + '" width="' + barWidth(result.direct.p50Ms) +
            '" height="18" rx="9" fill="#65758c"/>',
            '<line x1="' + x(result.direct.p25Ms) + '" y1="' + (directY + 9) +
            '" x2="' + x(result.direct.p75Ms) + '" y2="' + (directY + 9) +
            '" stroke="#f1f7ff" stroke-width="2"/>',
            '<line x1="' + x(result.direct.p25Ms) + '" y1="' + (directY + 4) +
            '" x2="' + x(result.direct.p25Ms) + '" y2="' + (directY + 14) +
            '" stroke="#f1f7ff" stroke-width="2"/>',
            '<line x1="' + x(result.direct.p75Ms) + '" y1="' + (directY + 4) +
            '" x2="' + x(result.direct.p75Ms) + '" y2="' + (directY + 14) +
            '" stroke="#f1f7ff" stroke-width="2"/>',
            '<rect x="' + left + '" y="' + wrapperY + '" width="' + barWidth(result.nodeCmd.p50Ms) +
            '" height="18" rx="9" fill="#45e8ff"/>',
            '<line x1="' + x(result.nodeCmd.p25Ms) + '" y1="' + (wrapperY + 9) +
            '" x2="' + x(result.nodeCmd.p75Ms) + '" y2="' + (wrapperY + 9) +
            '" stroke="#f1f7ff" stroke-width="2"/>',
            '<line x1="' + x(result.nodeCmd.p25Ms) + '" y1="' + (wrapperY + 4) +
            '" x2="' + x(result.nodeCmd.p25Ms) + '" y2="' + (wrapperY + 14) +
            '" stroke="#f1f7ff" stroke-width="2"/>',
            '<line x1="' + x(result.nodeCmd.p75Ms) + '" y1="' + (wrapperY + 4) +
            '" x2="' + x(result.nodeCmd.p75Ms) + '" y2="' + (wrapperY + 14) +
            '" stroke="#f1f7ff" stroke-width="2"/>',
            '<text x="' + Math.min(width - 82, x(result.direct.p50Ms) + 10) + '" y="' + (directY + 14) +
            '" fill="#9baabd" font-family="Consolas, monospace" font-size="13">' +
            number(result.direct.p50Ms) + '</text>',
            '<text x="' + Math.min(width - 82, x(result.nodeCmd.p50Ms) + 10) + '" y="' + (wrapperY + 14) +
            '" fill="#9af4ff" font-family="Consolas, monospace" font-size="13">' +
            number(result.nodeCmd.p50Ms) + '</text>',
            '<text x="' + (width - 52) + '" y="' + (top + 68) +
            '" text-anchor="end" fill="#ffc35c" font-family="Consolas, monospace" font-size="11">' +
            escapeXml(deltaLabel) + '</text>'
        );
    });

    const footerY = height - footer + 45;
    const generatedDate = report.generatedAt.slice(0, 10);

    lines.push(
        '<rect x="56" y="' + (footerY - 24) + '" width="16" height="16" rx="4" fill="#65758c"/>',
        '<text x="82" y="' + (footerY - 10) + '" fill="#9baabd" font-family="Segoe UI, sans-serif" font-size="14">Node direct</text>',
        '<rect x="190" y="' + (footerY - 24) + '" width="16" height="16" rx="4" fill="#45e8ff"/>',
        '<text x="216" y="' + (footerY - 10) + '" fill="#9baabd" font-family="Segoe UI, sans-serif" font-size="14">node-cmd</text>',
        '<text x="56" y="' + (footerY + 32) + '" fill="#9baabd" font-family="Consolas, monospace" font-size="13">' +
        escapeXml(
            report.samplesPerImplementation + ' measured launches each · ' +
            report.warmupsPerImplementation + ' warmups · Node ' +
            report.environment.node + ' · ' + report.environment.platform + ' ' +
            report.environment.arch + ' · ' + generatedDate
        ) + '</text>',
        '<text x="56" y="' + (footerY + 59) + '" fill="#9baabd" font-family="Segoe UI, sans-serif" font-size="14">Paired deltas include wrapper cost and host variance; inspect confidence intervals and raw samples.</text>',
        '</svg>'
    );

    return lines;
}

function dispatchChart() {
    const width = 1200;
    const left = 312;
    const right = 110;
    const plotWidth = width - left - right;
    const header = 188;
    const rowHeight = 84;
    const footer = 126;
    const height = header + (report.dispatchResults.length * rowHeight) + footer;
    const maximum = Math.max(
        ...report.dispatchResults.flatMap((result) => [
            result.direct.p75Ns,
            result.nodeCmd.p75Ns
        ])
    ) * 1.18;
    const x = (value) => left + ((value / maximum) * plotWidth);
    const barWidth = (value) => Math.max(2, x(value) - left);
    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="title description">',
        '<title id="title">node-cmd JavaScript dispatch overhead</title>',
        '<desc id="description">Seven comparisons isolate JavaScript wrapper dispatch without starting a process. Most wrappers add only a few nanoseconds; synchronous result normalization remains measured in nanoseconds.</desc>',
        '<rect width="1200" height="' + height + '" rx="28" fill="#060b16"/>',
        '<text x="56" y="70" fill="#45e8ff" font-family="Consolas, monospace" font-size="17" font-weight="700" letter-spacing="2">NODE-CMD / JAVASCRIPT DISPATCH BENCHMARK</text>',
        '<text x="56" y="120" fill="#f1f7ff" font-family="Segoe UI, sans-serif" font-size="38" font-weight="800">Nanoseconds, not milliseconds.</text>',
        '<text x="56" y="154" fill="#9baabd" font-family="Segoe UI, sans-serif" font-size="19">Counter stubs · no child process started · median ns/call · IQR whiskers</text>'
    ];

    for (let tick = 0; tick <= 4; tick++) {
        const tickX = left + ((plotWidth / 4) * tick);
        const value = (maximum / 4) * tick;

        lines.push(
            '<line x1="' + tickX + '" y1="' + (header - 18) + '" x2="' + tickX +
            '" y2="' + (height - footer + 12) + '" stroke="#18263a" stroke-width="1"/>',
            '<text x="' + tickX + '" y="' + (header - 30) + '" text-anchor="middle" fill="#9baabd" font-family="Consolas, monospace" font-size="13">' +
            number(value, 0) + ' ns</text>'
        );
    }

    report.dispatchResults.forEach((result, index) => {
        const top = header + (index * rowHeight);
        const directY = top + 15;
        const wrapperY = top + 45;
        const delta = result.pairedDelta.p50Ns;
        const deltaCi = result.pairedDelta.medianCi95Ns;
        const deltaLabel = (delta >= 0 ? '+' : '') + number(delta, 2) + ' ns Δ · CI ' +
            number(deltaCi[0], 2) + '…' + number(deltaCi[1], 2);

        lines.push(
            '<text x="56" y="' + (top + 41) + '" fill="#f1f7ff" font-family="Segoe UI, sans-serif" font-size="18" font-weight="700">' +
            escapeXml(result.label) + '</text>',
            '<rect x="' + left + '" y="' + directY + '" width="' + barWidth(result.direct.p50Ns) +
            '" height="18" rx="9" fill="#65758c"/>',
            '<line x1="' + x(result.direct.p25Ns) + '" y1="' + (directY + 9) +
            '" x2="' + x(result.direct.p75Ns) + '" y2="' + (directY + 9) +
            '" stroke="#f1f7ff" stroke-width="2"/>',
            '<rect x="' + left + '" y="' + wrapperY + '" width="' + barWidth(result.nodeCmd.p50Ns) +
            '" height="18" rx="9" fill="#45e8ff"/>',
            '<line x1="' + x(result.nodeCmd.p25Ns) + '" y1="' + (wrapperY + 9) +
            '" x2="' + x(result.nodeCmd.p75Ns) + '" y2="' + (wrapperY + 9) +
            '" stroke="#f1f7ff" stroke-width="2"/>',
            '<text x="' + Math.min(width - 82, x(result.direct.p50Ns) + 10) + '" y="' + (directY + 14) +
            '" fill="#9baabd" font-family="Consolas, monospace" font-size="13">' +
            number(result.direct.p50Ns) + '</text>',
            '<text x="' + Math.min(width - 82, x(result.nodeCmd.p50Ns) + 10) + '" y="' + (wrapperY + 14) +
            '" fill="#9af4ff" font-family="Consolas, monospace" font-size="13">' +
            number(result.nodeCmd.p50Ns) + '</text>',
            '<text x="' + (width - 52) + '" y="' + (top + 68) +
            '" text-anchor="end" fill="#ffc35c" font-family="Consolas, monospace" font-size="11">' +
            escapeXml(deltaLabel) + '</text>'
        );
    });

    const footerY = height - footer + 45;
    const iterationCounts = report.dispatchResults.map((result) => result.iterationsPerBatch);
    const minimumIterations = Math.min(...iterationCounts);
    const maximumIterations = Math.max(...iterationCounts);
    const iterationLabel = minimumIterations === maximumIterations
        ? minimumIterations.toLocaleString('en-US')
        : minimumIterations.toLocaleString('en-US') + '–' +
            maximumIterations.toLocaleString('en-US');

    lines.push(
        '<rect x="56" y="' + (footerY - 24) + '" width="16" height="16" rx="4" fill="#65758c"/>',
        '<text x="82" y="' + (footerY - 10) + '" fill="#9baabd" font-family="Segoe UI, sans-serif" font-size="14">Node direct stub</text>',
        '<rect x="214" y="' + (footerY - 24) + '" width="16" height="16" rx="4" fill="#45e8ff"/>',
        '<text x="240" y="' + (footerY - 10) + '" fill="#9baabd" font-family="Segoe UI, sans-serif" font-size="14">node-cmd wrapper</text>',
        '<text x="56" y="' + (footerY + 32) + '" fill="#9baabd" font-family="Consolas, monospace" font-size="13">' +
        escapeXml(
            report.samplesPerImplementation + ' measured batches · ' +
            iterationLabel + ' calls per batch · Node ' + report.environment.node
        ) + '</text>',
        '<text x="56" y="' + (footerY + 59) + '" fill="#9baabd" font-family="Segoe UI, sans-serif" font-size="14">This isolates JavaScript dispatch; it does not claim to make Node or the operating system launch faster.</text>',
        '</svg>'
    );

    return lines;
}

mkdirSync(outputDirectory, {recursive: true});
writeChart('node-cmd-process-benchmark.svg', processChart());
writeChart('node-cmd-dispatch-benchmark.svg', dispatchChart());
