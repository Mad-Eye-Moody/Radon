import * as types from './constants.js';
import VirtualNode from './virtualNode.js'


class SiloNode {
  constructor(name, value, parent = null, modifiers = {}, type = types.PRIMITIVE, devTool = null) {
    this.name = name;
    this.value = value;
    this.modifiers = modifiers;
    this.queue = [];
    this.subscribers = [];
    this.parent = parent; // circular silo node
    this.type = type;
    this.devTool = devTool;
    // bind
    this.linkModifiers = this.linkModifiers.bind(this);
    this.runModifiers = this.runModifiers.bind(this);
    this.notifySubscribers = this.notifySubscribers.bind(this); 
    this.getState = this.getState.bind(this);
    this.reconstructArray = this.reconstructArray.bind(this);
    this.reconstructObject = this.reconstructObject.bind(this);
    this.deconstructObjectIntoSiloNodes = this.deconstructObjectIntoSiloNodes.bind(this);
    this.reconstruct = this.reconstruct.bind(this);
    this.pushToSubscribers = this.pushToSubscribers.bind(this);
    this.removeFromSubscribersAtIndex = this.removeFromSubscribersAtIndex(this);
    
    // invoke functions
    this.runQueue = this.runModifiers();
    
    if(this.type === 'ARRAY' || this.type === 'OBJECT'){
      this.modifiers.keySubscribe = (key, renderFunction) => {
        const name = this.name + '_' + key;
        let node = this.value[name]
        const subscribedAtIndex = node.pushToSubscribers(renderFunction);
        node.notifySubscribers();
        return () => {node._subscribers.splice(subscribedAtIndex, 1)}
      }
    }
    
    this.id;
    this.issueID();
    this.virtualNode = new VirtualNode(this, this.modifiers);
  }

  get name() {
    return this._name;
  }

  set name(name) {
    if (!name || typeof name !== 'string') throw new Error('Name is required and should be a string')
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
    if (typeof modifiers !== 'object' || Array.isArray(modifiers)) throw new Error('Modifiers must be a plain object');
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
    if (parent && parent.constructor.name !== 'SiloNode') throw new Error('Parent must be null or a siloNode');
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

  set type(type) {
    if (typeof type !== 'string' || !types[type]) throw new Error('Type must be an available constant');
    this._type = type;
  }

  get virtualNode(){
    return this._virtualNode
  }

  set virtualNode(virtualNode){
    this._virtualNode = virtualNode;
  }

  get id(){
    return this._id;
  }

 

  pushToSubscribers(renderFunction){
    this.subscribers.push(renderFunction);
  }

  removeFromSubscribersAtIndex(index){
    this.subcribers = this.subscribers.slice(index, 1);
  }

  //there's no setter for the ID because you cant set it directly. you have to use issueID

  //issueID MUST BE CALLED ON THE NODES IN ORDER ROOT TO LEAF. it always assumes that this node's parent will
  //have had issueID called on it before. use applyToSilo to make sure it runs in the right order
  issueID(){
    if(this.parent === null){ //its the root node
      this._id = this.name;
    } else {                  //its not the root node
      this._id = this.parent.id + '.' + this.name;
    }
  }

  notifySubscribers() {
    if (this.subscribers.length === 0) return;
    // subscribers is an array of functions that notify subscribed components of state changes
    this.subscribers.forEach(func => {
      if (typeof func !== 'function') throw new Error('Subscriber array must only contain functions');
      // pass the updated state into the subscribe functions to trigger re-renders on the frontend 
      func(this.getState());
    })
  }

  /**
   * Invoked once in the siloNode constructor to create a closure. The closure variable 
   * 'running' prevents the returned async function from being invoked if it's
   * still running from a previous call
   */
  runModifiers() {
    let running = false; // prevents multiple calls from being made if set to false

    async function run() {
      if (running === false) { // prevents multiple calls from being made if already running
        running = true;
        // runs through any modifiers that have been added to the queue
        while (this.queue.length > 0) {

          // enforces that we always wait for a modifier to finish before proceeding to the next
          let nextModifier = this.queue.shift();
          let previousState = null;
          if(this.devTool) {
            if(this.type !== types.PRIMITIVE) {
              previousState = this.reconstruct(this.name, this);
            } else {
              previousState = this.value;
            }
          }
          this.value = await nextModifier();
          if(this.devTool) {
            this.devTool.notify(previousState, this.value, this.name, nextModifier.modifierName);
          }
          this.virtualNode.updateTo(this.value);
          if (this.type !== types.PRIMITIVE) this.value = this.deconstructObjectIntoSiloNodes().value;
          
          this.notifySubscribers();
        }
        running = false;   
      }
    }

    return run;
  }

  /**
   * Deconstructs objects into a parent siloNode with a type of object/array, and
   * children siloNodes with values pertaining to the contents of the object
   * @param {string} objName - The intended key of the object when stored in the silo
   * @param {object} objectToDeconstruct - Any object that must contain a key of value
   * @param {SiloNode} parent - Intended SiloNode parent to the deconstructed object
   * @param {boolean} runLinkedMods - True only when being called for a constructorNode
   */
  deconstructObjectIntoSiloNodes(objName = this.name, objectToDeconstruct = this, parent = this.parent, runLinkedMods = false) {
    const objChildren = {};
    let type, keys;
  
    // determine if the objectToDeconstruct is an array or plain object
    if (Array.isArray(objectToDeconstruct.value)) {
      keys = objectToDeconstruct.value;
      type = types.ARRAY;
    } else {
      keys = Object.keys(objectToDeconstruct.value);
      type = types.OBJECT;
    }
    
    // a silonode must be created before its children are made, because the children need to have
    // this exact silonode passed into them as a parent, hence objChildren is currently empty
    const newSiloNode = new SiloNode(objName, objChildren, parent, objectToDeconstruct.modifiers, type, this.devTool);
    
    // for arrays only
    if (Array.isArray(objectToDeconstruct.value) && objectToDeconstruct.value.length > 0) {
      // loop through the values in the objectToDeconstruct to create siloNodes for each of them
      objectToDeconstruct.value.forEach((indexedVal, i) => {
        // recurse if the array has objects stored in its indices that need further deconstructing
        if (typeof indexedVal === 'object') objChildren[`${objName}_${i}`] = this.deconstructObjectIntoSiloNodes(`${objName}_${i}`, {value: indexedVal}, newSiloNode, runLinkedMods);
        // otherwise for primitives we can go straight to creating a new siloNode
        // the naming convention for keys involves adding '_i' to the object name
        else objChildren[`${objName}_${i}`] = new SiloNode(`${objName}_${i}`, indexedVal, newSiloNode, {}, types.PRIMITIVE, this.devTool);
      })
    } 
    
    // for plain objects
    else if (keys.length > 0) {
      // loop through the key/value pairs in the objectToDeconstruct to create siloNodes for each of them
      keys.forEach(key => {
        // recurse if the object has objects stored in its values that need further deconstructing
        if (typeof objectToDeconstruct.value[key] === 'object') objChildren[`${objName}_${key}`] = this.deconstructObjectIntoSiloNodes(`${objName}_${key}`, {value: objectToDeconstruct.value[key]}, newSiloNode, runLinkedMods);
        // otherwise for primitives we can go straight to creating a new siloNode
        // the naming convention for keys involves adding '_key' to the object name 
        else objChildren[`${objName}_${key}`] = new SiloNode(`${objName}_${key}`, objectToDeconstruct.value[key], newSiloNode, {}, types.PRIMITIVE, this.devTool);
      })
    }

    // linkModifiers should only be run if a constructorNode has been passed into this function
    // because that means that the silo is being created for the first time and the modifiers need
    // to be wrapped. For deconstructed objects at runtime, wrapping is not required
    if (runLinkedMods) newSiloNode.linkModifiers();

    return newSiloNode;
  }

  /**
   * Wraps developer written modifiers in async functions with state passed in automatically
   * @param {string} nodeName - The name of the siloNode
   * @param {object} stateModifiers - An object containing unwrapped modifiers most likely from the constructorNode
   */
  linkModifiers(nodeName = this.name, stateModifiers = this.modifiers) {
    if (!stateModifiers || Object.keys(stateModifiers).length === 0) return;
    const that = this;

    // loops through every modifier created by the dev
    Object.keys(stateModifiers).forEach(modifierKey => {

      // renamed for convenience
      const modifier = stateModifiers[modifierKey];
      if (typeof modifier !== 'function' ) throw new Error('All modifiers must be functions'); 

      // modifiers with argument lengths of 2 or less are meant to edit primitive values
      // OR arrays/objects in their entirety (not specific indices)
      else if (modifier.length <= 2) {
        // the dev's modifier function needs to be wrapped in another function so we can pass 
        // the current state value into the 'current' parameter
        let linkedModifier;
        // for primitives we can pass the value straight into the modifier
        if (that.type === types.PRIMITIVE) linkedModifier = async (payload) => await modifier(that.value, payload);
        // for objects we need to reconstruct the object before it is passed into the modifier
        else if (that.type === types.OBJECT || that.type === types.ARRAY) {
          linkedModifier = async (payload) => await modifier(this.reconstruct(nodeName, that), payload);
        }
        
        // the linkedModifier function will be wrapped in one more function. This final function is what
        // will be returned to the developer
        // this function adds the linkedModifier function to the async queue with the payload passed in as
        // the only parameter. Afterward the queue is invoked which will begin moving through the 
        // list of modifiers
        this.modifiers[modifierKey] = payload => {
          // wrap the linkedModifier again so that it can be added to the async queue without being invoked
          const callback = async () => await linkedModifier(payload);
          if(this.devTool) {
            callback.modifierName = modifierKey;
          }
          that.queue.push(callback);
          that.runQueue();
        }
      }

      // modifiers with argument lengths of more than 2 are meant to edit specific indices or
      // key/value pairs of objects ONLY
      else if (modifier.length > 2) {
        // the dev's modifier function needs to be wrapped in another function so we can pass 
        // the current state value into the 'current' parameter
        // reconstruct will reassemble objects but will simply return if a primitive is passed in
        const linkedModifier = async (index, payload) => await modifier(this.reconstruct(index, that.value[index]), index, payload); 

        // the linkedModifier function will be wrapped in one more function. This final function is what
        // will be returned to the developer
        // this function adds the linkedModifier function to the async queue with the payload passed in as
        // the only parameter. Afterward the queue is invoked which will begin moving through the 
        // list of modifiers
        this.modifiers[modifierKey] = (index, payload) => {
          // wrap the linkedModifier again so that it can be added to the async queue without being invoked
          const callback = async () => await linkedModifier(`${this.name}_${index}`, payload);
          // since the modifier is called on the ARRAY/OBJECT node, we need to add the callback
          // to the queue of the child. The naming convention is: 'objectName_i' || 'objectName_key'
          if(this.devTool) {
            callback.modifierName = modifierKey;
          }
          that.value[`${this.name}_${index}`].queue.push(callback);
          that.value[`${this.name}_${index}`].runQueue();
        }
      }
    })
    
    Object.keys(this.modifiers).forEach( modifierKey => {
      this.virtualNode[modifierKey] = this.modifiers[modifierKey];
    })
  }

  /**
   * A middleman function used for redirection. Should be called with an object needed reconstruction
   * and will then accurately assign its next destination
   * @param {string} siloNodeName - The name of the siloNode
   * @param {object} currSiloNode - The address of the parent 'OBJECT/ARRAY' siloNode
   */
  reconstruct(siloNodeName, currSiloNode) {
    let reconstructedObject;
    if (currSiloNode.type === types.OBJECT) reconstructedObject = this.reconstructObject(siloNodeName, currSiloNode);
    else if (currSiloNode.type === types.ARRAY) reconstructedObject = this.reconstructArray(siloNodeName, currSiloNode);
    // called if the value passed in is a primitive
    else return currSiloNode.value;

    return reconstructedObject;
  }

  /**
   * Reconstructs plain objects out of siloNode values
   * @param {string} siloNodeName - The name of the siloNode
   * @param {object} currSiloNode - The address of the parent 'OBJECT' siloNode
   */
  reconstructObject(siloNodeName, currSiloNode) {
    // our currently empty object to be used for reconstruction
    const newObject = {};
    // loop through the siloNodes stored in the 'OBJECT' value to extract the data
    Object.keys(currSiloNode.value).forEach(key => {
      // simplified name
      const childObj = currSiloNode.value[key];
      
      // get the keyName from the naming convention
      // if the siloNode name is 'cart_shirts', the slice will give us 'shirts'
      const extractedKey = key.slice(siloNodeName.length + 1);
      // if an additional object is stored in the values, then we must recurse to
      // reconstruct the nested object as well
      if (childObj.type === types.OBJECT || childObj.type === types.ARRAY) {
        newObject[extractedKey] = this.reconstruct(key, childObj);
      }
      // otherwise we have a primitive value which can easily be added to the reconstructed
      // object using our extractedKey to properly label it 
      else if (childObj.type === types.PRIMITIVE) {
        newObject[extractedKey] = childObj.value;
      }
    })

    // object successfully reconstructed at this level
    return newObject;
  }

  /**
   * Reconstructs arrays out of siloNode values
   * @param {string} siloNodeName - The name of the siloNode
   * @param {object} currSiloNode - The address of the parent 'ARRAY' siloNode
   */
  reconstructArray(siloNodeName, currSiloNode) {
    // our currently empty array to be used for reconstruction
    const newArray = [];
    // loop through the siloNodes stored in the 'ARRAY' value to extract the data
    Object.keys(currSiloNode.value).forEach((key, i) => {
      // simplified name
      const childObj = currSiloNode.value[key];
      // if an additional object is stored in the values, then we must recurse to
      // reconstruct the nested object as well
      if (childObj.type === types.ARRAY || childObj.type === types.OBJECT) {
        newArray.push(this.reconstruct(`${siloNodeName}_${i}`, childObj));
      } 
      // otherwise we have a primitive value which can easily be added to the reconstructed
      // object using our extractedKey to properly label it
      else if (childObj.type === types.PRIMITIVE) {
        newArray.push(childObj.value);
      }
    })

    // array successfully reconstructed at this level
    return newArray;
  }

  getState(){
    if(this.type === types.CONTAINER){
      return this.virtualNode
    } else {
      let context = this.virtualNode;
      while(context.type !== types.CONTAINER){
        context = context.parent;
      }
      return context;
    }
  }

  // unsheatheChildren() {

  //   const state = {};
  //   // call getState on parent nodes up till root and collect all variables/modifiers from parents
  //   if (this.parent !== null) {
  //     const parentState = this.parent.unsheatheChildren();
  //     Object.keys(parentState).forEach(key => {
  //       state[key] = parentState[key];
  //     })
  //   }

  //   // getting children of objects/arays is redundant
  //   if (this.type !== types.ARRAY && this.type !== types.OBJECT)
  //     Object.keys(this.value).forEach(siloNodeName => {
  //       const currSiloNode = this.value[siloNodeName];
  //       if (currSiloNode.type === types.OBJECT || currSiloNode.type === types.ARRAY) state[siloNodeName] = this.reconstruct(siloNodeName, currSiloNode);
  //       else if (currSiloNode.type === types.PRIMITIVE) state[siloNodeName] = currSiloNode.value;

  //       // some siloNodes don't have modifiers
  //       if (currSiloNode.modifiers) {
  //         Object.keys(currSiloNode.modifiers).forEach(modifier => {
  //           state[modifier] = currSiloNode.modifiers[modifier];
  //         })
  //       }
  //     })

  //   return state;
  // }
}

export default SiloNode;