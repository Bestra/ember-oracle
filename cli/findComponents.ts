import { getFiles } from './runFiles'
import * as path from 'path'
import * as recast from 'recast'


class ComponentDefinition {
    name: string;
    filePath: string;
    props: any[];

    constructor(filePath: string) {
        let isPod = filePath.indexOf('pods') > 0;
        if (isPod) {
            this.name = filePath.split('pods/components/')[1].split('/component.js')[0]
        } else {
            let parts = filePath.split('/')
            this.name = path.basename(parts[parts.length - 1])
        }
        this.props = [];
    }
}


export default function findComponentFiles(appRoot: string): Array<string> {
  let podComponents = getFiles(path.join(appRoot, 'components'), '.js');
  let nonPodComponents = getFiles(path.join(appRoot, 'pods/components'), '.js');
  
  return [].concat(podComponents, nonPodComponents);
}
