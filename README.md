# node-cmd

*Node.js commandline/terminal interface.*  

Simple commandline, terminal, or shell interface to allow you to run cli or bash style commands as if you were in the terminal.

Run commands asynchronously, and if needed can get the output as a string.

#### NPM Stats

npm info :    
[![NPM](https://nodei.co/npm/node-cmd.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/node-cmd/)  
[See npm trends and stats for node-cmd](http://npm-stat.com/charts.html?package=node-cmd&author=&from=&to=)  
![node-cmd npm version](https://img.shields.io/npm/v/node-cmd.svg) ![supported node version for node-cmd](https://img.shields.io/node/v/node-cmd.svg) ![total npm downloads for node-cmd](https://img.shields.io/npm/dt/node-cmd.svg) ![monthly npm downloads for node-cmd](https://img.shields.io/npm/dm/node-cmd.svg) ![npm licence for node-cmd](https://img.shields.io/npm/l/node-cmd.svg)

[![RIAEvangelist](https://avatars3.githubusercontent.com/u/369041?v=3&s=100)](https://github.com/RIAEvangelist)

GitHub info :  
![node-cmd GitHub Release](https://img.shields.io/github/release/RIAEvangelist/node-cmd.svg) ![GitHub license node-cmd license](https://img.shields.io/github/license/RIAEvangelist/node-cmd.svg) ![open issues for node-cmd on GitHub](https://img.shields.io/github/issues/RIAEvangelist/node-cmd.svg)

Package details websites :
* [GitHub.io site](http://riaevangelist.github.io/node-cmd/ "node-cmd documentation"). A prettier version of this site.
* [NPM Module](https://www.npmjs.org/package/node-cmd "node-cmd npm module"). The npm page for the node-cmd module.

This work is licenced via the MIT Licence.


# Methods

|method | arguments | functionality | returns |
|-------|-----------|---------------|---------|
|run    | command, callback | runs a command asynchronously| args for callback `err`,`data`,`stderr` |
|runSync| command   | runs a command ***synchronously*** | obj {`err`,`data`,`stderr`} |


## Examples

```javascript

//*nix

    var cmd=require('node-cmd');

//*nix supports multiline commands
    
    cmd.runSync('touch ./example/example.created.file');

    cmd.run(
        `cd ./example
ls`,
        function(err, data, stderr){
            console.log('examples dir now contains the example file along with : ',data)
        }
    );

```

```javascript

//Windows

    var cmd=require('node-cmd');

//Windows multiline commands are not guaranteed to work try condensing to a single line.
    
    const syncDir=cmd.runSync('cd ./example & dir');

    console.log(`
    
        Sync Err ${syncDir.err}
        
        Sync stderr:  ${syncDir.stderr}

        Sync Data ${syncDir.data}
    
    `);

    cmd.run(`dir`,
        function(err, data, stderr){
            console.log('the node-cmd dir contains : ',data)
        }
    );

```

```javascript

//clone this repo!

    var cmd=require('node-cmd');
    
    const syncClone=cmd.runSync('git clone https://github.com/RIAEvangelist/node-cmd.git');

    console.log(syncClone);
    
```


### Getting the CMD Process ID

```javascript

    var cmd=require('node-cmd');

    var process=cmd.run('node');
    console.log(process.pid);

```

### Running a python shell from node

```javascript
const cmd=require('node-cmd');

const processRef=cmd.run('python -i');
let data_line = '';

//listen to the python terminal output
processRef.stdout.on(
  'data',
  function(data) {
    data_line += data;
    if (data_line[data_line.length-1] == '\n') {
      console.log(data_line);
    }
  }
);

const pythonTerminalInput=`primes = [2, 3, 5, 7]
for prime in primes:
    print(prime)

`;

//show what we are doing
console.log(`>>>${pythonTerminalInput}`);

//send it to the open python terminal
processRef.stdin.write(pythonTerminalInput);

```

Output :

```python

>>>primes = [2, 3, 5, 7]
for prime in primes:
    print(prime)


2
3
5
7


```
