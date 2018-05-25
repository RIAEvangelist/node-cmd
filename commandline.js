var exec = require('child_process').exec;

var commandline = {
  get: getString,
  run: runCommand
};

function runCommand(command, options) {
  options = options || {};
  exec(
    command,
    options
  );
}

function getString(command, callback, options) {
  options = options || {};
  exec(
    command,
    options,
    (
      function () {
        return function (err, data, stderr) {
          callback(data, err, stderr);
        }
      }
    )(callback)
  );
}

module.exports = commandline;

