var cmd=require('../cmd.js');

const syncDir=cmd.runSync('cd');

console.log(`

cmd.runSync('cd')


err:     ${syncDir.err}

stderr:  ${syncDir.stderr}

data:    ${syncDir.data}

        `);

cmd.run(
    'dir',
    function(err,data,stderr){
        console.log(`

cmd.run('dir',func);  

err:     ${err}

stderr:  ${stderr}

data:    ${data}

        `);
    }
);