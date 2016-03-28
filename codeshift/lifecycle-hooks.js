const hookNames = [
'init',
'didReceiveAttrs',
'willRender',
'didInsertElement',
'didRender',
'didUpdateAttrs',
'didReceiveAttrs',
'willUpdate',
'willRender',
'didUpdate',
'didRender',
'willDestroyElement',
'willClearRender',
'didDestroyElement'
                  ];

const spreadSuperMatcher = 
  {callee:
    {object: {type: "ThisExpression"},
        property: {name: "_super"}
                      }
                  }

const applySuperMatcher = 
  {callee:
    {object:
       {
         object: {type: "ThisExpression"},
         property: {name: "_super"}
       },
      property: {name: "apply"}}};

const not = function(fn) {
  return function() { return !fn.apply(this, arguments) }
};

export default function transformer(file, api) {
  const j = api.jscodeshift;
  
  const hasSuperCall = function(node) {
    let spreadCalls = j(node).find(j.CallExpression, spreadSuperMatcher);
    let applyCalls = j(node).find(j.CallExpression, applySuperMatcher);
    return spreadCalls.paths().length || applyCalls.paths().length;
  };
  
  const {expression, statement, statements} = j.template;
  const componentDefinition = j(file.source)
    .find(j.ExportDefaultDeclaration)
    .find(j.CallExpression, {callee:
                             {property:
                              {name: "extend"}
                             }
                            });
  
  
  const functionHooks = componentDefinition
  .find(j.Property, {value: {type: "FunctionExpression"}})
  .filter(h => { 
    return hookNames.indexOf(h.node.key.name) > -1});
  
  
  let noSuper = functionHooks.filter(not(hasSuperCall));
  
  let newColl = noSuper.replaceWith(({node}) => {
    api.stats("needs super call");
    console.log(`${file.path}:${node.loc.start.line} ${node.key.name}`);
    node.value.body.body.unshift("this._super(...arguments);");
    return node;
  });
  return newColl.toSource();
};
