import * as callGraph from '../util/callGraph'
import * as _ from 'lodash'
/**
 * Really simply checks if the props in the template exist in the context.
 * Null is fine.
 */
export function undefinedProps(templateModule: string) {
      let {template, context} = callGraph.nodes[templateModule]
      
      let templateProps = _.keys(template.props);
      let contextProps = _.keys(context.props);
      
      return _.difference(templateProps, contextProps);
}