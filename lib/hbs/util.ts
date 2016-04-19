
import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'

function startsWithin(line, column, container) {
    if (line < container.line) { return false; } // completely excluded
    if (line > container.line) { return true; } // completely included
    if (line === container.line) {
        if (column >= container.column) {
            return true;
        } else {
            return false;
        }
    }
}

function endsWithin(line, column, container) {
    if (line > container.line) { return false; } // completely excluded
    if (line < container.line) { return true; } // completely included
    if (line === container.line) {
        if (column <= container.column) {
            return true;
        } else {
            return false;
        }
    }
}

export function containsPosition({loc}: htmlBars.ASTNode, {line, column}: htmlBars.Position) {
    return startsWithin(line, column, loc) &&
        endsWithin(line, column, loc);
}

export function findNodes<T>(ast, type, filterFn: (node: T) => boolean) {
    let found: T[] = [];
    let finder = {};
    finder[type] = {};
    finder[type].enter = function (node: T) {
        if (filterFn(node)) {
            found.push(node);
        }
    };
    htmlBars.traverse(ast, finder);
    return found;
}