'use strict';

const cmd = require('../cmd.js');

async function main() {
    const values = ['spaces stay together', 'shell&characters;stay-literal'];
    const {stdout} = await cmd.runFilePromise(
        process.execPath,
        ['-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', ...values]
    );

    console.log(JSON.parse(stdout));
}

main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
});
