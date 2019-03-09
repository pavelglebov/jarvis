function parseArgs(arr) {
  let args = {};

  arr.forEach((arg) => {
    if (arg.slice(0,2) === '--') {
      const argVal  = arg.slice(2).split('=');
      argVal[1] = argVal[1] === 'true' ? true :
        argVal[1] === 'false' ? false :
        argVal[1];
      args[argVal[0]] = argVal[1];
    }
  });

  return args;
}

module.exports = parseArgs;