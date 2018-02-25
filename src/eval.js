export default (code, globals) => {
  let removeGlobals = '';
  Object.getOwnPropertyNames(this).forEach(property => {
    removeGlobals += `var ${property} = undefined;`;
  });

  let addGlobals = '';
  Object.keys(globals).forEach(global => {
    addGlobals = `var ${global} = globals['${global}'];`;
  });

  const newCode = `${removeGlobals}${addGlobals}${code}`;
  code = undefined;
  removeGlobals = undefined;
  addGlobals = undefined;

  // eslint-disable-next-line no-eval
  eval(newCode);
};
