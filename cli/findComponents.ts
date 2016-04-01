import { getFiles } from './runFiles'
import * as path from 'path'

interface ComponentDefinition {
    name: string;
    path: string;
}

function createComponentDefinition(filePath: string, isPod: boolean): ComponentDefinition {
    let name: string;
    if (isPod) {
       name = filePath.split('pods/components/')[1].split('/component.js')[0]
    } else {
        let parts = filePath.split('/')
        name = path.basename(parts[parts.length - 1])
    }
    return {
        path: filePath,
        name: name
    }
}
export default function findComponentFiles(appRoot: string): Array<ComponentDefinition> {
  let podComponents = getFiles(path.join(appRoot, 'components'), '.js').map((p) => {
      return createComponentDefinition(p, true);   
  });
  let nonPodComponents = getFiles(path.join(appRoot, 'pods/components'), '.js').map((p) => {
      return createComponentDefinition(p, false);
  })
  
  return [].concat(podComponents, nonPodComponents);
}