const { exec, execSync } = require('child_process'); 

const commandline={
    run:runCommand,
    runSync:runSync,
    //will be deprecated soon as run is now the same.
    get:runCommand,
    
};

function runCommand(command,callback){
    
    return exec(
        command,
        (
            function(){
                return function(err,data,stderr){
                    if(!callback)
                        return;

                    callback(err, data, stderr);
                }
            }
        )(callback)
    );
}

function runSync(command){
    try {
        return { 
            data:   execSync(command).toString(), 
            err:    null, 
            stderr: null 
        }
    } 
    catch (error) {
        return { 
            data:   null, 
            err:    error.stderr.toString(), 
            stderr: error.stderr.toString() 
        }
    }
}

module.exports=commandline;
