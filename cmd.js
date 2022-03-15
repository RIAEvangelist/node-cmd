const { exec, execSync } = require('child_process'); 

const commandline={
    run:runCommand,
    runSync:runSync,
};

/**
 * @description Synchronous operation instruction
 * @param command {string}
 * @param callback {{error: ExecException | null, stdout: string, stderr: string}|function():{error: ExecException | null, stdout: string, stderr: string}}
 * @return {ChildProcess}
 * @example
 * runCommand('node -v',(err,data)=>{
 *  if (err) console.log(err);
 *  console.log(data);
 * })
 */

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

/**
 * @description Asynchronous operation instruction
 * @param command
 * @return {{data: null, err: string, stderr: string}|{data: string, err: null, stderr: null}}
 * @example
   const {data,err,stderr} = runSync('node -v')
   console.log(err,data,stderr)
 **/

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
