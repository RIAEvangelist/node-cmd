#node-cmd
-
*Node.js commandline/terminal interface.*  

Simple commandline or terminal interface to allow you to run cli or bash style commands as if you were in the terminal.

Run commands asynchronously, and if needed can get the output as a string.

npm info :  [See npm trends and stats for node-cmd](http://npm-stat.com/charts.html?package=node-cmd&author=&from=&to=)  
![node-cmd npm version](https://img.shields.io/npm/v/node-cmd.svg) ![supported node version for node-cmd](https://img.shields.io/node/v/node-cmd.svg) ![total npm downloads for node-cmd](https://img.shields.io/npm/dt/node-cmd.svg) ![monthly npm downloads for node-cmd](https://img.shields.io/npm/dm/node-cmd.svg) ![npm licence for node-cmd](https://img.shields.io/npm/l/node-cmd.svg)

[![RIAEvangelist](https://avatars3.githubusercontent.com/u/369041?v=3&s=100)](https://github.com/RIAEvangelist)

GitHub info :  
![node-cmd GitHub Release](https://img.shields.io/github/release/RIAEvangelist/node-cmd.svg) ![GitHub license node-cmd license](https://img.shields.io/github/license/RIAEvangelist/node-cmd.svg) ![open issues for node-cmd on GitHub](https://img.shields.io/github/issues/RIAEvangelist/node-cmd.svg)

Package details websites :
* [GitHub.io site](http://riaevangelist.github.io/node-cmd/ "node-cmd documentation"). A prettier version of this site.
* [NPM Module](https://www.npmjs.org/package/node-cmd "node-cmd npm module"). The npm page for the node-cmd module.

This work is licenced via the [DBAD Public Licence](http://www.dbad-license.org/).


#Methods
-

|method | arguments | functionality |
|-------|-----------|---------------|
|run    | command   | runs a command asynchronously|
|get    | command,callback  | runs a command asynchronously, when the command is complete all of the stdout will be passed to the callback|


#Examples
-

```javascript

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

    cmd.get(
        `
            git clone https://github.com/RIAEvangelist/node-cmd.git
            cd node-cmd
            ls
        `,
        function(data){
            console.log('the node-cmd cloned dir contains these files :\n\n',data)
        }
    );

```
