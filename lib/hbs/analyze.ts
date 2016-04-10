import { parse } from 'htmlbars/dist/cjs/htmlbars-syntax'
const fs = require('fs');

function writeAst(hbsPath, src) {
  let ast = parse(src);
  let newPath = hbsPath + '.ast';
  fs.writeFileSync(newPath, JSON.stringify(ast, [], 4));
};

export default parse;
