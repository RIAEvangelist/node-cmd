import run from './api.test.js';

const result = await run();
process.exitCode = result.ok ? 0 : 1;
