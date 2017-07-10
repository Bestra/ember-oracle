import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax';

function startsWithin(
  line: number,
  column: number,
  container: htmlBars.Position
) {
  // console.log("check start - ",[line, column, container.line, container.column].join(':'))
  if (line < container.line) {
    return false;
  } // completely excluded
  if (line > container.line) {
    return true;
  } // completely included
  if (line === container.line) {
    if (column >= container.column) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

function endsWithin(line, column, container: htmlBars.Position) {
  // console.log("check end - ",[line, column, container.line, container.column].join(':'))
  if (line > container.line) {
    return false;
  } // completely excluded
  if (line < container.line) {
    return true;
  } // completely included
  if (line === container.line) {
    if (column <= container.column) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

/**
 * pp formats location info for printing
 */
let pp = l => {
  return `${l.start.line}:${l.start.column} - ${l.end.line}:${l.end.column}`;
};

export function containsPosition(
  { loc },
  { line, column }: htmlBars.Position
) {
  if (!loc) {
    return false;
  }
  return (
    startsWithin(line, column, loc.start) && endsWithin(line, column, loc.end)
  );
}

export function containsNode(
  parent: htmlBars.ASTNode,
  child: htmlBars.ASTNode
) {
  return (
    containsPosition(parent, child.loc.start) &&
    containsPosition(parent, child.loc.end)
  );
}

export function findNodes<T>(ast, type, filterFn: (node: T) => boolean) {
  let found: T[] = [];
  let finder = {};
  finder[type] = {};
  finder[type].enter = function(node: T) {
    if (filterFn(node)) {
      found.push(node);
    }
  };
  htmlBars.traverse(ast, finder);
  return found;
}
