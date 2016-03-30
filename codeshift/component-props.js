// we're actually just using the transformer here to
// spit out the public properties defined on the component.
//
// because I'm lazy.
//

let fs = require('fs');
const printComponent = function (file, propertyNames) {
  let componentDef = {
    name: file.path,
    props: propertyNames
  };
  console.log(componentDef);
};

export default function transformer(file, api) {
  const j = api.jscodeshift;

  console.log(file);
  const {expression, statement, statements} = j.template;
  const componentDefinition = j(file.source)
    .find(j.ExportDefaultDeclaration)
    .find(j.CallExpression, {callee:
                             {property:
                              {name: "extend"}
                             }
                            });

  const propNames = [];
  const properties = componentDefinition
  .forEach((path) => {
    let componentArgs = path.value.arguments;
    let props = componentArgs[componentArgs.length - 1]
    .properties
    .filter((p) => {
      return p.value.type !== "FunctionExpression"
      && p.key.name !== "actions"
    });

    props.forEach((node) => {
      propNames.push({name: node.key.name, line: node.loc.start.line})
    });

    printComponent(file, propNames);
  }

};
