'use strict';

const groups = [
    require('./unit.test.js'),
    require('./functional.test.js'),
    require('./integration.test.js'),
    require('./regression.test.js')
];

function selectGroups(names) {
    if (names.length === 0) return groups;

    const requested = new Set(names.map((name) => name.toLowerCase()));
    const selected = groups.filter((group) => requested.delete(group.name.toLowerCase()));

    if (requested.size > 0) {
        throw new Error('Unknown test set: ' + [...requested].join(', '));
    }

    return selected;
}

async function run(names = []) {
    const {default: VanillaTest} = await import('vanilla-test');
    const suite = new VanillaTest();
    const descriptions = new Set();

    for (const group of selectGroups(names)) {
        for (const testCase of group.cases) {
            const description = group.name + ' · ' + testCase.description;

            if (descriptions.has(description)) {
                throw new Error('Duplicate test description: ' + description);
            }
            descriptions.add(description);
            suite.expects(description);

            try {
                await testCase.callback();
                suite.pass();
            } catch (error) {
                console.error(error?.stack || error);
                suite.fail();
            }

            suite.done();
        }
    }

    return suite.report();
}

module.exports = run;
module.exports.groups = groups;
module.exports.run = run;
