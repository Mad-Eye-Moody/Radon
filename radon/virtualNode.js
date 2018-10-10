import * as types from './constants'

class VirtualNode {
    constructor (node, modifiers) {
        this.parent = null;
        if(node.parent){
            
            this.parent = node.parent.virtualNode;
            
        } 

        
        this.name = node.name;
        this.type = node.type;
        this.id = node.id;

        

        if(this.type === types.PRIMITIVE){
            //value should just be an empty object.
            //when your children are being made
            //they'll just put themselves into your value.
            this.val = node.value;
        } else {
            this.val = {};
            if(this.type === types.ARRAY){ this.val = [] } 
        } 

        if(node.type !== types.CONTAINER){
            let name = node.name;
            if(name.includes('_')) name = name.split('_')[name.split('_').length - 1];

            node.parent.virtualNode.val[name] = this;
            if(this.parent.type === types.CONTAINER){
                this.parent[name] = this;
            }
        }

        if(node.modifiers){
            let modifierKeys = Object.keys(modifiers);
            
            modifierKeys.forEach(modifierKey => {
                this[modifierKey] = modifiers[modifierKey];
            })
        }

    }   
    updateTo(data){
        this.val = data;
    }
}

export default VirtualNode;
