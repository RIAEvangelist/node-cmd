var exec = require('child_process').exec;

var commandline={
    get:getString,
    run:runCommand
};

function runCommand(command){
    //return object with pid as one of keys, pid = cmd.run()['pid'];
    return exec(
        command
    );
}

function getString(command,callback){
    //return object with pid as one of keys, pid = cmd.get()['pid'];
    return exec(
        command,
        (
            function(){
                return function(err,data,stderr){
                    if(!callback)
                        return;

                    callback(data, err, stderr);
                }
            }
        )(callback)
    );
}

module.exports=commandline;
