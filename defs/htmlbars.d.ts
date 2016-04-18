/**
   * These definitions were adapted from the ones 
   * pulled from htmlbars/packages/htmlbars-syntax/lib/builders.js
   * For now I've included the originals as comments for reference
   */
declare module 'htmlbars/dist/cjs/htmlbars-syntax' {
    export function parse(foo): Program;
    export function traverse(node: ASTNode, visitor: any);

    export function enter<T>(node: T): void;
    export function exit<T>(node: T): void;


    /**
     * MustacheStatements are anything inside {{}}
     */
    export interface MustacheStatement {
        path: PathExpression;
        params: Param[];
        hash: Hash;
        escaped: boolean;
        loc: Loc;
    }
    // export function buildMustache(path, params, hash, raw, loc) {
    //   return {
    //     type: "MustacheStatement",
    //     path: buildPath(path),
    //     params: params || [],
    //     hash: hash || buildHash([]),
    //     escaped: !raw,
    //     loc: buildLoc(loc)
    //   };
    // }

    /**
     * BlockStatements are a subset of MustacheStatement
     */
    export interface BlockStatement extends MustacheStatement {
        program: Program;
        inverse: any;
    }
    // export function buildBlock(path, params, hash, program, inverse, loc) {
    //   return {
    //     type: "BlockStatement",
    //     path: buildPath(path),
    //     params: params || [],
    //     hash: hash || buildHash([]),
    //     program: program || null,
    //     inverse: inverse || null,
    //     loc: buildLoc(loc)
    //   };
    // }

    export interface ElementModifierStatement {
        path: PathExpression;
        params: Param[];
        hash: Hash;
        loc: Loc;
    }
    // export function buildElementModifier(path, params, hash, loc) {
    //   return {
    //     type: "ElementModifierStatement",
    //     path: buildPath(path),
    //     params: params || [],
    //     hash: hash || buildHash([]),
    //     loc: buildLoc(loc)
    //   };
    // }

    export interface PartialStatement {
        name: string;
        params: Param[];
        hash: Hash;
        indent: number;
        loc: Loc;
    }

    // export function buildPartial(name, params, hash, indent) {
    //   return {
    //     type: "PartialStatement",
    //     name: name,
    //     params: params || [],
    //     hash: hash || buildHash([]),
    //     indent: indent
    //   };
    // }

    export interface CommentStatement {
        value: any;
        loc: Loc;

    }

    // export function buildComment(value) {
    //   return {
    //     type: "CommentStatement",
    //     value: value
    //   };
    // }

    export interface ConcatStatement {
        parts: any[];
        loc: Loc;

    }

    // export function buildConcat(parts) {
    //   return {
    //     type: "ConcatStatement",
    //     parts: parts || []
    //   };
    // }

    // Nodes

    export interface ElementNode {
        tag: string;
        attributes: AttrNode[];
        modifiers: ElementModifierStatement;
        children: any;
        loc: Loc;
    }
    // export function buildElement(tag, attributes, modifiers, children, loc) {
    //   return {
    //     type: "ElementNode",
    //     tag: tag || "",
    //     attributes: attributes || [],
    //     modifiers: modifiers || [],
    //     children: children || [],
    //     loc: buildLoc(loc)
    //   };
    // }

    export interface ComponentNode {
        tag: string;
        attributes: AttrNode[];
        program: Program;
        loc: Loc;
        isStatic: boolean;
    }
    // export function buildComponent(tag, attributes, program, loc) {
    //   return {
    //     type: "ComponentNode",
    //     tag: tag,
    //     attributes: attributes,
    //     program: program,
    //     loc: buildLoc(loc),

    //     // this should be true only if this component node is guaranteed
    //     // to produce start and end points that can never change after the
    //     // initial render, regardless of changes to dynamic inputs. If
    //     // a component represents a "fragment" (any number of top-level nodes),
    //     // this will usually not be true.
    //     isStatic: false
    //   };
    // }

    export interface AttrNode {
        name: string;
        value: any;
        loc: Loc;

    }

    // export function buildAttr(name, value) {
    //   return {
    //     type: "AttrNode",
    //     name: name,
    //     value: value
    //   };
    // }

    export interface TextNode {
        chars: string;
        loc: Loc;
    }

    // export function buildText(chars, loc) {
    //   return {
    //     type: "TextNode",
    //     chars: chars || "",
    //     loc: buildLoc(loc)
    //   };
    // }

    // Expressions

    export interface SubExpression {
        path: PathExpression;
        params: Param[];
        hash: Hash;
        loc: Loc;

    }

    // export function buildSexpr(path, params, hash) {
    //   return {
    //     type: "SubExpression",
    //     path: buildPath(path),
    //     params: params || [],
    //     hash: hash || buildHash([])
    //   };
    // }

    export interface PathExpression {
        original: string;
        parts: string[];
        loc: Loc;

    }

    // export function buildPath(original) {
    //   if (typeof original === 'string') {
    //     return {
    //       type: "PathExpression",
    //       original: original,
    //       parts: original.split('.')
    //     };
    //   } else {
    //     return original;
    //   }
    // }

    export interface StringLiteral {
        value: any;
        original: any;
        loc: Loc;

    }

    // export function buildString(value) {
    //   return {
    //     type: "StringLiteral",
    //     value: value,
    //     original: value
    //   };
    // }

    export interface BooleanLiteral {
        value: any;
        original: any;
        loc: Loc;

    }

    // export function buildBoolean(value) {
    //   return {
    //     type: "BooleanLiteral",
    //     value: value,
    //     original: value
    //   };
    // }

    export interface NumberLiteral {
        value: any;
        original: any;
        loc: Loc;

    }

    // export function buildNumber(value) {
    //   return {
    //     type: "NumberLiteral",
    //     value: value,
    //     original: value
    //   };
    // }

    export interface NullLiteral {
        value: any;
        original: any;
        loc: Loc;
    }

    // export function buildNull() {
    //   return {
    //     type: "NullLiteral",
    //     value: null,
    //     original: null
    //   };
    // }

    export interface UndefinedLiteral {
        value: any;
        original: any;
        loc: Loc;


    }
    // export function buildUndefined() {
    //   return {
    //     type: "UndefinedLiteral",
    //     value: undefined,
    //     original: undefined
    //   };
    // }

    // Miscellaneous

    export interface Hash {
        pairs: HashPair[]
        loc: Loc;

    }

    // export function buildHash(pairs) {
    //   return {
    //     type: "Hash",
    //     pairs: pairs || []
    //   };
    // }


    export interface HashPair {
        key: string;
        value: Param;
        loc: Loc;

    }
    // export function buildPair(key, value) {
    //   return {
    //     type: "HashPair",
    //     key: key,
    //     value: value
    //   };
    // }

    export interface Program {
        body: any[];
        blockParams: string[];
        loc: Loc;
    }

    // export function buildProgram(body, blockParams, loc) {
    //   return {
    //     type: "Program",
    //     body: body || [],
    //     blockParams: blockParams || [],
    //     loc: buildLoc(loc)
    //   };
    // }

    // function buildSource(source) {
    //   return source || null;
    // }

    // function buildPosition(line, column) {
    //   return {
    //     line: (typeof line === 'number') ? line : null,
    //     column: (typeof column === 'number') ? column : null
    //   };
    // }
    type Source = string;
    export interface Position {
        line: number;
        column: number;
    }

    export interface Loc {
        source: Source;
        start: Position;
        end: Position;
    }


    export type Literal =
        StringLiteral
        | BooleanLiteral
        | NumberLiteral
        | NullLiteral
        | UndefinedLiteral;


    export type Expression = SubExpression | PathExpression
    export type Param = Expression | Literal;
    export type Node =
        ElementNode
        | ComponentNode
        | AttrNode
        | TextNode;

    export type Statement =
        MustacheStatement
        | BlockStatement
        | ElementModifierStatement
        | PartialStatement
        | CommentStatement
        | ConcatStatement;

    export type ASTNode =
        Statement
        | Node
        | Expression
        | Literal
        | Hash
        | HashPair
        | Program



    // function buildLoc(startLine, startColumn, endLine, endColumn, source) {
    //   if (arguments.length === 1) {
    //     var loc = startLine;

    //     if (typeof loc === 'object') {
    //       return {
    //         source: buildSource(loc.source),
    //         start: buildPosition(loc.start.line, loc.start.column),
    //         end: buildPosition(loc.end.line, loc.end.column)
    //       };
    //     } else {
    //       return null;
    //     }
    //   } else {
    //     return {
    //       source: buildSource(source),
    //       start: buildPosition(startLine, startColumn),
    //       end: buildPosition(endLine, endColumn)
    //     }; 
    //   }
    // }

}