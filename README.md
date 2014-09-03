#node-cmd
-
*Node.js commandline/terminal interface.*  

Simple commandline or terminal interface to allow you to run cli or bash style commands as if you were in the terminal.

Run commands asynchronously, and if needed can get the output as a string.

#Methods
-

|method | arguments | functionality |
|-------|-----------|---------------|
|run    | command   | runs a command asynchronously|
|get    | command,callback  | runs a command asynchronously, when the command is complete all of the stdout will be passed to the callback|


#Examples
-

    var cmd=require('node-cmd');
    
    cmd.get(
        'pwd',
        function(data){
            console.log('the current working dir is : ',data)
        }
    );
    
    cmd.run('touch example.created.file');
    
    cmd.get(
        'ls',
        function(data){
            console.log('the current dir contains these files :\n\n',data)
        }
    );

