const cmd=require('../cmd.js');

const processRef=cmd.get('python -i');
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
    print(primes)

`;

//show what we are doing
console.log(`>>>${pythonTerminalInput}`);

//send it to the open python terminal
processRef.stdin.write(pythonTerminalInput);
