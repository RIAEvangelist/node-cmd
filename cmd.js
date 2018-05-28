var exec = require('child_process').exec;

var commandline = {
  get: getString,
  run: runCommand
};

function runCommand(command, options) {
  options = options || {};

  //return refrence to the child process
  return exec(
    command,
    options
  );
}

function getString(command, callback, options) {
  options = options || {};

  //return refrence to the child process
  return exec(
    command,
    options,
    (
      function () {
        return function (err, data, stderr) {
          if (!callback)
            return;

          callback(err, data, stderr);
        }
      }
    )(callback)
  );
}

module.exports = commandline;

