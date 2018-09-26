

class VirtualNode {
    constructor (parent, name, id) {
        this.parent = parent;
        this.name = name;
        this.id = id;
        this.value;
        this.type;
    }

    //the modifiers need to be put in dynamically,
    //as does keySubscribe
}

module.exports = VirtualNode;