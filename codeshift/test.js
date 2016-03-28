export default function transformer(file, api) {
  const j = api.jscodeshift;
  const {expression, statement, statements} = j.template;

  const createNewAssert = function({node}) {
    console.log(`${file.path}:${node.loc.start.line}`);
    let a = node.arguments[0].object.arguments;
        let b = node.arguments[1];
        return expression`assert.foundElement(${a},${b})`;
  };

  const wholeThing = j(file.source);
  return j(file.source)
    .find(j.Identifier, {name: 'ok'})
    .closest(j.CallExpression, {arguments: 
                                [{object: 
                                  {callee: 
                                   {name: "find"
                                   }
                                  },
                                 property: {name: "length"}},
                                 {type: "Literal"}]})
    .replaceWith(createNewAssert)
    .toSource();
};

