import * as registry from './registry'
import * as _ from 'lodash'
import * as fs from 'fs'
import { Template, ComponentInvocation } from '../hbs'

export let invocationsByTemplate = {};
export let invocationsByComponent = {};

export function init() {
    _.forEach(registry.allModules('template'), (val, key) => {
        let template = val.definition as Template;
        let invocations = template.components;
        invocationsByTemplate[template.moduleName] =
            {
                componentInvocations: invocations,
                context: template.renderingContext
            }
    });

    invocationsByComponent = _(invocationsByTemplate)
        .values()
        .map('componentInvocations')
        .flatten()
        .groupBy('moduleName')
        .value();
}

export function parentTemplates(componentModule: string) {
    let components = invocationsByComponent[componentModule] as ComponentInvocation[];
    return _(components)
        .map(c => c.invokedAt)
        .map(p => [p.filePath, p.position.line, p.position.column].join(':'))
        .value();
}