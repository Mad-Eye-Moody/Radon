// import * as types from './constants.js';
const types = require('./constants.js');

class SiloNode {
  constructor(name, value, parent = null, modifiers = {}, type = types.PRIMITIVE) {
    this.name = name;
    this.value = value;
    this.modifiers = modifiers;
    this.queue = [];
    this.subscribers = [];
    this.parent = parent; // circular silo node
    this.type = type;
    this.id;

    // bind
    this.linkModifiers = this.linkModifiers.bind(this);
    this.runModifiers = this.runModifiers.bind(this);
    this.notifySubscribers = this.notifySubscribers.bind(this);
    this.getState = this.getState.bind(this);
    this.reconstructArray = this.reconstructArray.bind(this);
    this.reconstructObject = this.reconstructObject.bind(this);
    this.deconstructObjectIntoSiloNodes = this.deconstructObjectIntoSiloNodes.bind(this);
    this.reconstruct = this.reconstruct.bind(this);

    // invoke functions
    this.runQueue = this.runModifiers();
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get value() {
    return this._value;
  }

  set value(value) {
    this._value = value;
  }

  get modifiers() {
    return this._modifiers;
  }

  set modifiers(modifiers) {
    this._modifiers = modifiers;
  }

  get queue() {
    return this._queue;
  }

  set queue(queue) {
    this._queue = queue;
  }

  get parent() {
    return this._parent;
  }

  set parent(parent) {
    this._parent = parent;
  }

  get subscribers() {
    return this._subscribers;
  }

  set subscribers(subscribers) {
    this._subscribers = subscribers;
  }

  get type() {
    return this._type;
  }

  get id() {
    return this._id;
  }

  pushToSubscribers(renderFunction) {
    this._subscribers.push(renderFunction)
    return this._subscribers.length;
  }

  removeFromSubscribersAtIndex(index) {
    this._subscribers.splice(index, 1);
  }

  //there's no setter for the ID because you cant set it directly. you have to use issueID

  //issueID MUST BE CALLED ON THE NODES IN ORDER ROOT TO LEAF. it always assumes that this node's parent will
  //have had issueID called on it before. use applyToSilo to make sure it runs in the right order
  issueID(){
    this._id = 0;
    if(this.parent === null){ //its the root node
      this._id = this.name;
    } else {                  //its not the root node
      this._id = this.parent.id + '.' + this.name;
    }
  }
  
  set type(type) {
    this._type = type;
  }

  notifySubscribers() {
    if (this.subscribers.length === 0) return;
    this.subscribers.forEach(func => {
      if (typeof func !== 'function') throw new Error('Subscriber array must only contain functions');
      func(this.getState());
    })
  }

  runModifiers() {
    let running = false; // prevents multiple calls from being made if already running

    async function run() {
      if (running === false) { // prevents multiple calls from being made if already running
        running = true;
        while (this.queue.length > 0) {
          this.value = await this.queue.shift()();
          if (this.type !== types.PRIMITIVE) this.value = this.deconstructObjectIntoSiloNodes().value;
          this.notifySubscribers();
        }
        running = false;   
      } else {
        return 'in progress...';
      }
    }
    return run;
  }

  deconstructObjectIntoSiloNodes(objName = this.name, objectToDeconstruct = this, parent = this.parent, runLinkedMods = false) {
    const objChildren = {};
    let type, keys;
  
    // determine if array or other object
    if (Array.isArray(objectToDeconstruct.value)) {
      keys = objectToDeconstruct.value;
      type = types.ARRAY;
    } else {
      keys = Object.keys(objectToDeconstruct.value);
      type = types.OBJECT;
    }
  
    const newSiloNode = new SiloNode(objName, objChildren, parent, objectToDeconstruct.modifiers, type);
    
    if (Array.isArray(objectToDeconstruct.value) && objectToDeconstruct.value.length > 0) {
      // loop through the array
      objectToDeconstruct.value.forEach((indexedVal, i) => {
        // recurse if the array has objects stored in its indices
        if (typeof indexedVal === 'object') objChildren[`${objName}_${i}`] = this.deconstructObjectIntoSiloNodes(`${objName}_${i}`, {value: indexedVal}, newSiloNode, runLinkedMods);
        else objChildren[`${objName}_${i}`] = new SiloNode(`${objName}_${i}`, indexedVal, newSiloNode);
      })
    } 
    
    else if (keys.length > 0) {
      // loop through object
      keys.forEach(key => {
        // recurse if the object has objects stored in its values
        if (typeof objectToDeconstruct.value[key] === 'object') objChildren[`${objName}_${key}`] = this.deconstructObjectIntoSiloNodes(`${objName}_${key}`, {value: objectToDeconstruct.value[key]}, newSiloNode, runLinkedMods);
        else objChildren[`${objName}_${key}`] = new SiloNode(`${objName}_${key}`, objectToDeconstruct.value[key], newSiloNode);
      })
    }

    if (runLinkedMods) newSiloNode.linkModifiers();

    return newSiloNode;
  }

  linkModifiers(nodeName = this.name, stateModifiers = this.modifiers) {
    if (!stateModifiers || Object.keys(stateModifiers).length === 0) return;
    const that = this;
    // looping through every modifier added by the dev
    Object.keys(stateModifiers).forEach(modifierKey => {
      const modifier = stateModifiers[modifierKey];

      if (typeof modifier !== 'function' ) throw new TypeError(); 

      // adds middleware that will affect the value of this node
      else if (modifier.length <= 2) {
        // wrap the dev's modifier function so we can pass the current node value into it
        let linkedModifier;
        if (that.type === types.PRIMITIVE) linkedModifier = async (payload) => await modifier(that.value, payload);
        // that.value is an object and we need to reassemble it
        else if (that.type === types.OBJECT || that.type === types.ARRAY) {
          linkedModifier = async (payload) => await modifier(this.reconstruct(nodeName, that), payload);
        }
        
        // the function that will be called when the dev tries to call their modifier
        this.modifiers[modifierKey] = payload => {
          // wrap the linkedModifier again so that it can be added to the async queue without being invoked
          const callback = async () => await linkedModifier(payload);
          that.queue.push(callback);
          that.runQueue();
        }
      }

      // adds middleware that will affect the value of a child node of index
      else if (modifier.length > 2) {
        // wrap the dev's modifier function so we can pass the current node value into it
        const linkedModifier = async (index, payload) => await modifier(this.reconstruct(index, that.value[index]), index, payload); 

        // the function that will be called when the dev tries to call their modifier
        this.modifiers[modifierKey] = (index, payload) => {
          // wrap the linkedModifier again so that it can be added to the async queue without being invoked
          const callback = async () => await linkedModifier(`${this.name}_${index}`, payload);
          that.value[`${this.name}_${index}`].queue.push(callback);
          that.value[`${this.name}_${index}`].runQueue();
        }
      }
    })
  }

  reconstruct(siloNodeName, currSiloNode) {
    let reconstructedObject;
    if (currSiloNode.type === types.OBJECT) reconstructedObject = this.reconstructObject(siloNodeName, currSiloNode);
    else if (currSiloNode.type === types.ARRAY) reconstructedObject = this.reconstructArray(siloNodeName, currSiloNode);
    else return currSiloNode.value;
    return reconstructedObject;
  }

  reconstructObject(siloNodeName, currSiloNode) {
    const newObject = {};
    // loop through object values currently stored as nodes
    Object.keys(currSiloNode.value).forEach(key => {
      const childObj = currSiloNode.value[key];
      
      //get keyName from the naming convention
      const extractedKey = key.slice(siloNodeName.length + 1);
      if (childObj.type === types.OBJECT || childObj.type === types.ARRAY) {
        newObject[extractedKey] = this.reconstruct(key, childObj);
      } else if (childObj.type === types.PRIMITIVE) {
        newObject[extractedKey] = childObj.value;
      }
    })
    return newObject;
  }

  reconstructArray(siloNodeName, currSiloNode) {
    const newArray = [];
    // loop through array indices currently stored as nodes
    Object.keys(currSiloNode.value).forEach((key, i) => {
      const childObj = currSiloNode.value[key];
      if (childObj.type === types.ARRAY || childObj.type === types.OBJECT) {
        newArray.push(this.reconstruct(`${siloNodeName}_${i}`, childObj));
      } else if (childObj.type === types.PRIMITIVE) {
        newArray.push(childObj.value);
      }
    })
    return newArray;
  }

  getState() {
    const state = {};
    // call getState on parent nodes up till root and collect all variables/modifiers from parents
    if (this.parent !== null) {
      const parentState = this.parent.getState();
      Object.keys(parentState).forEach(key => {
        state[key] = parentState[key];
      })
    }

    // getting children of objects/arays is redundant
    if (this.type !== types.ARRAY && this.type !== types.OBJECT)
      Object.keys(this.value).forEach(siloNodeName => {
        const currSiloNode = this.value[siloNodeName];
        if (currSiloNode.type === types.OBJECT || currSiloNode.type === types.ARRAY) state[siloNodeName] = this.reconstruct(siloNodeName, currSiloNode);
        else if (currSiloNode.type === types.PRIMITIVE) state[siloNodeName] = currSiloNode.value;

        // some siloNodes don't have modifiers
        if (currSiloNode.modifiers) {
          Object.keys(currSiloNode.modifiers).forEach(modifier => {
            state[modifier] = currSiloNode.modifiers[modifier];
          })
        }
      })

    return state;
  }
}

// export default SiloNode;
module.exports = SiloNode;