var cmd=require('../cmd.js');

const syncDir = cmd.runSync("pwd");

console.log(`

cmd.runSync('pwd')


err:     ${syncDir.err}

stderr:  ${syncDir.stderr}

data:    ${syncDir.data}

        `);

cmd.run(
    'ls',
    function(err,data){
        console.log(`

cmd.run('ls',func);  

err:     ${err}

err:     ${stderr}

data:    ${data}

        `);
    }
);
