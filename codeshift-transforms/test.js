export default function transformer(file, api) {
  const j = api.jscodeshift;
  const {expression, statement, statements} = j.template;

  const createNotFound = function ({node}) {
    console.log(`${file.path}:${node.loc.start.line} old notFound assertion`);
    let a = node.arguments[0].object.arguments;
    let b = node.arguments[1];
    return expression`assert.elementNotFound(${a},${b})`;
  };

   const createFound = function ({node}) {
    console.log(`${file.path}:${node.loc.start.line} old found assertion`);
    let a = node.arguments[0].object.arguments;
    let b = node.arguments[1];
    return expression`assert.elementFound(${a},${b})`;
  };
  
  let mod1 = j(file.source)
    .find(j.Identifier, {name: 'notOk'})
    .closest(j.CallExpression, {arguments:
                                [{object:
                                  {callee:
                                   {name: "find"
                                   }
                                  },
                                 property: {name: "length"}},
                                 {type: "Literal"}]})
    .replaceWith(createNotFound)
    .getAST()
  
  return j(mod1).find(j.Identifier, {name: 'ok'})
    .closest(j.CallExpression, {arguments:
                                [{object:
                                  {callee:
                                   {name: "find"
                                   }
                                  },
                                 property: {name: "length"}},
                                 {type: "Literal"}]})
    .replaceWith(createFound)
    .toSource({quote: 'single', wrapColumn: 50});
}