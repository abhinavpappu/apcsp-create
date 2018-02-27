export default (code, $_add = {}) => {
  const globals = Object.getOwnPropertyNames(window);
  globals.splice(globals.indexOf('eval'), 1);

  let removeGlobals = '';
  globals.forEach(property => {
    removeGlobals += `var ${property} = undefined;`;
  });

  let addGlobals = '';
  Object.keys($_add).forEach(key => {
    addGlobals += `var ${key} = $_add['${key}'];`;
  });

  const newCode = `${removeGlobals}${addGlobals}${code}`;
  code = undefined;
  removeGlobals = undefined;
  addGlobals = undefined;

  // eslint-disable-next-line no-eval
  eval(newCode);
};
