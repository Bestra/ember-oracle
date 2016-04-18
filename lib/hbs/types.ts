import * as htmlBars from 'htmlbars/dist/cjs/htmlbars-syntax'

export interface Template {
    filePath;
    source;
}

type FilePosition = {filePath; position: htmlBars.Position};

export interface ASTBacked<T extends htmlBars.ASTNode> {
    astNode: T;
}

export interface SourceDefineable {
    definedInSourceAt: FilePosition; 
}

export interface TemplateDefineable {
    definedInTemplateAt: FilePosition; 
}

export interface Path extends SourceDefineable, ASTBacked<htmlBars.PathExpression> {
    template;
}


export interface BlockParam extends TemplateDefineable {
    path: htmlBars.PathExpression;
    index: number;
    block;
};

export interface ComponentInvocation extends SourceDefineable, ASTBacked<htmlBars.MustacheStatement> {
    attrs: any[];
    template;
}