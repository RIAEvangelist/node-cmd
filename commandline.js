var exec = require('child_process').exec;
var execSync = require('child_process').execSync;

var commandline={
    get:getString,
    run:runCommand,
    getSync:getStringSync
};

function runCommand(command){
    exec(
        command
    );
}

function getString(command,callback){
    exec(
        command,
        (
            function(){
                return function(err,data,stderr){
                    callback(data,err,stderr);
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
