'use strict';

const assert = require('node:assert/strict');
const {readFileSync, statSync} = require('node:fs');
const {resolve} = require('node:path');
const {Script} = require('node:vm');

const siteRoot = resolve(__dirname, '../site');
const html = readFileSync(resolve(siteRoot, 'index.html'), 'utf8');
const css = readFileSync(resolve(siteRoot, 'styles.css'), 'utf8');
const javascript = readFileSync(resolve(siteRoot, 'script.js'), 'utf8');
const socialImage = statSync(resolve(siteRoot, 'og.png'));

new Script(javascript, {filename: 'site/script.js'});

assert.match(html, /<meta\s+name="description"/i);
assert.match(html, /<a[^>]+class="[^"]*skip-link/i);
assert.match(html, /href="\.\/styles\.css"/);
assert.match(html, /src="\.\/script\.js"/);
assert.match(html, /https:\/\/riaevangelist\.github\.io\/node-cmd\/og\.png/);
assert.match(css, /prefers-reduced-motion/);
assert.doesNotMatch(html, /(?:href|src)="http:\/\//i);
assert.ok(socialImage.size > 0);

const ids = new Set(
    [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])
);
const localTargets = [...html.matchAll(/href="#([^"]+)"/g)]
    .map((match) => match[1]);

for (const target of localTargets) {
    assert.ok(ids.has(target), `Missing local link target #${target}`);
}

const tabs = new Set(
    [...html.matchAll(/data-tab="([^"]+)"/g)].map((match) => match[1])
);
const panels = new Set(
    [...html.matchAll(/data-panel="([^"]+)"/g)].map((match) => match[1])
);

assert.ok(tabs.size >= 3);
assert.deepEqual(tabs, panels);

process.stdout.write('Static site structure and JavaScript passed.\n');
