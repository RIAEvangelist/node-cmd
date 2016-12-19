var exec = require('child_process').exec;

var commandline={
    get:getString,
    run:runCommand
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

module.exports=commandline;
