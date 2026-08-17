'use strict';

function defineGroup(name, define) {
    const cases = [];

    function test(description, callback) {
        cases.push(Object.freeze({description, callback}));
    }

    define(test);

    return Object.freeze({
        name,
        cases: Object.freeze(cases)
    });
}

module.exports = defineGroup;
