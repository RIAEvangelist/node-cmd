import run from './api.test.js';

const result = await run(process.argv.slice(2));
process.exitCode = result.ok ? 0 : 1;
