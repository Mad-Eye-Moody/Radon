//== map[../radon/constructorNode.js]

export interface ConstructorNode {
    name: string;

    state: object;

    parent: string;

    readonly _name: string;

    readonly _state: object;

    readonly _parent: string;

    initializeState(initialState: object) : void;

    initializeModifiers(initialModifiers: object) : void;

    constructor(name: string, parentName?: string) : void;
}
