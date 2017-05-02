export default function transformer(file, api) {
  const j = api.jscodeshift;
  const {expression, statement, statements} = j.template;

  return j(file.source)
    .find(j.CallExpression, {callee: {object: {name: "server"},
                                      property:{name: "respondWith"}}})
    .replaceWith(p => {
      let [requestType, requestPath, responseArgs] = p.value.arguments;
      if (!responseArgs.elements) { return p.value }
      let [status, ...otherArgs] = responseArgs.elements;
      let responseText = otherArgs[otherArgs.length -1];
      let stringifyFilter = {
        callee: {object: {name: "JSON"}, property: {name: "stringify"}}
      }

      let newResponse;
      if (j.match(responseText, stringifyFilter)) {
        newResponse = responseText.arguments;
      } else {
        newResponse = responseText;
      }

      if (status.value === 204 || status.value === 201) {
        return expression`$.mockjax({type: ${requestType},
                            url: ${requestPath},
                            status: ${status}
                          })`;
      } else {
        return expression`$.mockjax({type: ${requestType},
                            url: ${requestPath},
                            status: ${status},
                            responseText: ${newResponse}
                          })`;
      }

    })
    .toSource();
};
