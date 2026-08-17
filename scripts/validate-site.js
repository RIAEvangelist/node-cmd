'use strict';

const assert = require('node:assert/strict');
const {existsSync, readFileSync, statSync} = require('node:fs');
const {basename, extname, resolve} = require('node:path');
const {Script} = require('node:vm');

const siteRoot = resolve(__dirname, '../site');
const pageNames = [
    'index.html',
    'api.html',
    'testing.html',
    'security.html',
    'migration.html',
    'changelog.html'
];
const pages = new Map(pageNames.map((name) => [
    name,
    readFileSync(resolve(siteRoot, name), 'utf8')
]));
const css = readFileSync(resolve(siteRoot, 'styles.css'), 'utf8');
const javascript = readFileSync(resolve(siteRoot, 'script.js'), 'utf8');
const socialImage = statSync(resolve(siteRoot, 'og.png'));
const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

function assertBalancedMarkup(html, name) {
    const stack = [];

    for (const match of html.matchAll(/<(\/)?([a-z][a-z\d-]*)\b[^>]*>/gi)) {
        const closing = Boolean(match[1]);
        const tag = match[2].toLowerCase();

        if (voidElements.has(tag)) continue;

        if (!closing) {
            stack.push(tag);
            continue;
        }

        assert.equal(stack.pop(), tag, `${name} closes <${tag}> out of order`);
    }

    assert.deepEqual(stack, [], `${name} has unclosed elements`);
}

new Script(javascript, {filename: 'site/script.js'});

for (const [name, html] of pages) {
    assertBalancedMarkup(html, name);
    assert.match(html, /<!doctype html>/i, `${name} needs a doctype`);
    assert.match(html, /<meta\s+name="description"/i, `${name} needs a description`);
    assert.match(html, /<link\s+rel="canonical"\s+href="https:\/\/riaevangelist\.github\.io\/node-cmd\//i, `${name} needs a canonical URL`);
    assert.match(html, /https:\/\/riaevangelist\.github\.io\/node-cmd\/og\.png/, `${name} needs the social image`);
    assert.match(html, /<a[^>]+class="[^"]*skip-link[^"]*"[^>]+href="#main"/i, `${name} needs a skip link`);
    assert.match(html, /<main[^>]+id="main"/i, `${name} needs the main target`);
    assert.match(html, /href="\.\/styles\.css"/i, `${name} needs the shared stylesheet`);
    assert.match(html, /src="\.\/script\.js"/i, `${name} needs the shared script`);
    assert.doesNotMatch(html, /(?:href|src)="http:\/\//i, `${name} contains an insecure asset or link`);
    assert.doesNotMatch(html, /\bpreview\b|not yet published|current npm release remains v5/i, `${name} contains release-preview framing`);

    for (const requiredPage of pageNames) {
        assert.match(html, new RegExp(`href="\\./${requiredPage.replace('.', '\\.')}"`), `${name} does not link ${requiredPage}`);
    }

    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${name} contains duplicate IDs`);

    const localAnchors = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(localAnchors, ['main'], `${name} should use page navigation instead of in-page anchor navigation`);

    const localPaths = [...html.matchAll(/(?:href|src)="\.\/([^"]+)"/g)]
        .map((match) => match[1].split(/[?#]/, 1)[0])
        .filter((target) => target && target !== 'coverage/' && !target.endsWith('/'));

    for (const target of localPaths) {
        const localFile = resolve(siteRoot, target);
        assert.ok(existsSync(localFile), `${name} links missing local file ${target}`);
        assert.ok(['.html', '.css', '.js', '.png'].includes(extname(localFile)), `${name} links unexpected local file type ${target}`);
    }
}

const index = pages.get('index.html');
assert.match(index, /Command-line power\s*<em>for JavaScript\.<\/em>/i);
assert.match(index, /npm install node-cmd/);
assert.match(index, /zero runtime dependencies/i);
assert.match(index, /48\s*\/?\s*48/);

const api = pages.get('api.html');
for (const signature of [
    'run(command, options?, callback?)',
    'runPromise(command, options?)',
    'runSync(command, options?)',
    'runFile(file, args?, options?, callback?)',
    'runFilePromise(file, args?, options?)',
    'runFileSync(file, args?, options?)',
    'runStream(file, args?, options?)'
]) {
    assert.ok(api.includes(signature), `api.html is missing ${signature}`);
}
assert.match(api, /AbortSignal/);
assert.match(api, /process-tree boundary/i);

const testing = pages.get('testing.html');
assert.match(testing, /vanilla-test(?:@|<\/code>\s*)2\.1\.0/i);
assert.match(testing, /48\s*\/\s*48/);
for (const [name, count] of [
    ['Unit', 5],
    ['Functional', 17],
    ['Integration', 8],
    ['Regression', 18]
]) {
    assert.match(testing, new RegExp(`<strong>${name}<\\/strong><\\/td><td>${count}<`));
}
assert.match(testing, /<strong>100%<\/strong><span>branches<\/span>/);
assert.doesNotMatch(testing, /95\.23%/);
assert.match(testing, /"branches"\s*:\s*100/);
assert.match(testing, /coverage\/node\/index\.html/);
assert.match(testing, /test-results\.json/);
assert.match(testing, /Windows/);
assert.match(testing, /macOS/);
assert.match(testing, /Ubuntu/);

const security = pages.get('security.html');
assert.match(security, /shell injection/i);
assert.match(security, /(?:not|None is) a guaranteed hard execution deadline/i);
assert.match(security, /security\/advisories\/new/);

assert.match(pages.get('migration.html'), /v5\s*→\s*v6/);
assert.match(pages.get('migration.html'), /Upgrade checklist/);
assert.match(pages.get('changelog.html'), /node-cmd 6\.0\.0/);
assert.match(pages.get('changelog.html'), /2026-08-14/);
assert.match(pages.get('changelog.html'), /Current test gate<\/span><strong>48\s*\/\s*48/);
assert.match(pages.get('changelog.html'), /A 17-case JavaScript API suite/);

const tabs = new Set(
    [...index.matchAll(/data-tab="([^"]+)"/g)].map((match) => match[1])
);
const panels = new Set(
    [...index.matchAll(/data-panel="([^"]+)"/g)].map((match) => match[1])
);
assert.equal(tabs.size, 3);
assert.deepEqual(tabs, panels);

assert.match(css, /prefers-reduced-motion/);
assert.doesNotMatch(css, /scroll-behavior:\s*smooth/i);
assert.match(css, /\.doc-section/);
assert.match(css, /\.reference-table/);
assert.ok(socialImage.size > 0);

process.stdout.write(`Validated ${pages.size} engineer documentation pages, ${basename(resolve(siteRoot, 'script.js'))}, shared styles, navigation, and assets.\n`);
