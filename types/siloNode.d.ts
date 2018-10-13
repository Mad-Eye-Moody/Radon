//== map[../radon/siloNode.js]
export interface SiloNode {
    value: any;

    name: string;

    type: string;

    modifiers: any;

    parent: string;

    devTool: string;

    queue: Array<any>;

    subscribers: Array<any>;

    constructor(
    name : string, 
    value: any, 
    parent: string | null, 
    modifiers: object, 
    type: string, 
    devTool: any | null) : void; 

    pushToSubscribers(renderFunction: Function) : void;

    removeFromSubscribersAtIndex(index: number) : void;

    issueID() : void;

    notifySubscribers(): void;

    runModifiers(): void;

  deconstructObjectIntoSiloNodes(objName: string, objectToDeconstruct: any, parent: string | null, runLinkedMods: boolean) : object;

  linkModifiers(nodeName: string, stateModifiers: any): void;

  reconstruct(siloNodeName: any, currSiloNode: any) : any;

  reconstructArray(siloNodeName: any, currSiloNode: any) : any;

  reconstructObject(siloNodeName: any, currSiloNode: any) : any;

  getState() : any;

}
