#commandline
-
*Node.js commandline/terminal interface.*  

Simple commandline or terminal interface to allow you to run cli or bash style commands as if you were in the terminal.

Run commands asynchronously, and if needed can get the output as a string.

#Examples
-

    var cmd=require('node-cmd');
    
    cmd.get('ls');
    cmd.run('ls');
