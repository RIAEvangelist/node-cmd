var exec = require('child_process').exec;

var commandline={
    get:getString,
    run:runCommand
};

function runCommand(command,options){
    //return refrence to the child process
    return exec(
        command,
        options || {}
    );
}

function getString(command,options,callback){
    //return refrence to the child process
    var _options = callback ? options : {};
    var _callback = callback ? callback : options;
    return exec(
        command,
        _options,
        (
            function(cb){
                return function(err,data,stderr){
                    if(!cb)
                        return;
                    cb(err, data, stderr);
                }
            }
        )(_callback)
    );
}

module.exports=commandline;
