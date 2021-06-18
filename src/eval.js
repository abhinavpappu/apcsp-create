export default (code, $_add = {}) => {
  const globals = Object.getOwnPropertyNames(window);
  globals.splice(globals.indexOf('eval'), 1);

  // to avoid "SyntaxError: Unexpected token 'import'" when trying to do "var import = undefined"
  // since `import` is reserved keyword, but this is fine since `import` isn't allowed in `eval` anyway
  globals.splice(globals.indexOf('import'), 1);

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
