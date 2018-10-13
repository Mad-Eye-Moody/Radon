//== map[../radon/siloNode.js]
export interface VirtualNode {
    id: number;

    val: object;

    name: string;

    type: string;

    parent: string;

    parents: object;

    updateTo(data: object): void;    
}
