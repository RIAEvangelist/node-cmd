const { exec, execSync } = require('child_process'); 

const commandline={
    get:getString,
    run:runCommand,
    getSync:getStringSync
};

function runCommand(command){
    //return refrence to the child process
    return exec(
        command
    );
}

function getString(command,callback){
    //return refrence to the child process
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

/**
 * 
 * @param {*} command 
 * @param {*} callback 
 * @returns {Object} data, err 
 * 
 * If err is null, command was succesful
 */
function getStringSync(command){
    try {
        return { data: execSync(command).toString(), err: null }
    } 
    catch (error) {
        return { data: null, err: error.stderr.toString() }
    }
}


module.exports=commandline;
