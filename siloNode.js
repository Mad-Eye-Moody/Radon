class SiloNode {
  constructor(val, parent = null, modifiers = {}, type = 'PRIMITIVE') {
    this._value = val;
    this._modifiers = modifiers;
    this._queue = [];
    this._subscribers = [];
    this._parent = parent; // circular silo node
    this._type = type;

    // bind
    this.linkModifiers = this.linkModifiers.bind(this);
    this.runModifiers = this.runModifiers.bind(this);
    this.notifySubscribers = this.notifySubscribers.bind(this);
    this.getState = this.getState.bind(this);

    // invoke functions
    this.linkModifiers(this.modifiers);
    this.runQueue = this.runModifiers();
  }

  get value() {
    return this._value;
  }

  get modifiers() {
    return this._modifiers;
  }

  get queue() {
    return this._queue;
  }

  get parent() {
    return this._parent;
  }

  set subscribers() {
    return this._subscribers;
  }

  get subscribers() {
    return this._subscribers;
  }

  get type() {
    return this._type;
  }

  notifySubscribers() {
    if (this.subscribers.length === 0) return;
    this.subscribers.forEach(func => {
      if (typeof func !== 'function') throw new Error('subscriber array must only contain functions');
      func(this.value);
    })
  }

  runModifiers() {
    let running = false; // prevents multiple calls from being made if already running

    async function run() {
      if (running === false) { // prevents multiple calls from being made if already running
        running = true;
  
        while (this.queue.length > 0) {
          this.value = await this.queue.shift()();
          this.notifySubscribers();
        }              
      } else {
        return 'in progress...';
      }
    }
    return run;
  }

  linkModifiers(stateModifiers) {
    if (!stateModifiers) return;
    const that = this;

    // looping through every modifier added by the dev
    Object.keys(stateModifiers).forEach(modifierKey => {
      const modifier = stateModifiers[modifierKey];

      if (typeof modifier !== 'function' ) throw new TypeError(); 

      // adds middleware that will affect the value of this node
      else if (modifier.length <= 2) {
        // wrap the dev's modifier function so we can pass the current node value into it
        const linkedModifier = async (payload) => await modifier(that.value, payload); 

        // the function that will be called when the dev tries to call their modifier
        stateModifiers[modifierKey] = payload => {
          // wrap the linkedModifier again so that it can be added to the async queue without being invoked
          const callback = async () => await linkedModifier(payload);
          that.queue.push(callback);
          that.runQueue();
        }
      }

      // adds middleware that will affect the value of a child node of index
      else if (modifier.length > 2) {
        // wrap the dev's modifier function so we can pass the current node value into it
        const linkedModifier = async (index, payload) => await modifier(that.value[index].value, index, payload); 

        // the function that will be called when the dev tries to call their modifier
        stateModifiers[modifierKey] = (index, payload) => {
          // wrap the linkedModifier again so that it can be added to the async queue without being invoked
          const callback = async () => await linkedModifier(index, payload);
          that.value[index].queue.push(callback);
          that.value[index].runQueue();
        }
      }
    })
  }

  getState(currentNode = this) {
    const state = {};
    // recurse to root and collect all variables/modifiers from parents
    if (currentNode.parent !== 'root' && currentNode.parent !== null) {
      const parentData = this.getState(currentNode.parent);
      Object.keys(parentData).forEach(key => {
        state[key] = parentData[key];
      })
    }

    function handleObject(name, obj) {
      // get the original type of object
      const type = obj.type; 
      const newObject = {};

      // loop through object values currently stored as nodes
      Object.keys(obj.value).forEach(key => {
        const childObj = obj.value[key];
        //get keyName from the naming convention
        const extractedKey = key.slice(name.length + 1);
        if (childObj.type === 'OBJECT') {
          newObject[extractedKey] = handleObject(key, childObj);
        } else if (childObj.type === 'ARRAY') {
          newObject[extractedKey] = handleArray(key, childObj);
        } else if (childObj.type === 'PRIMITIVE') {
          newObject[extractedKey] = childObj.value;
        }
      })
      return newObject;
    }

    function handleArray(name, obj) {
      // get the original type of object
      const type = obj.type; 
      const newArray = [];

      // loop through array indices currently stored as nodes
      Object.keys(obj.value).forEach((key, i) => {
        const childObj = obj.value[key];
        if (childObj.type === 'ARRAY') {
          newArray.push(handleArray(`${name}_${i}`, childObj));
        } else if (childObj.type === 'OBJECT') {
          newArray.push(handleObject(`${name}_${i}`, obj))
        } else if (childObj.type === 'PRIMITIVE') {
          newArray.push(childObj.value);
        }
      })
      return newArray;
    }

    Object.keys(currentNode.value).forEach(key => {
      const node = currentNode.value[key];
      if (node.type === 'OBJECT') state[key] = handleObject(key, node);
      else if (node.type === 'ARRAY') state[key] = handleArray(key, node);
      else if (node.type === 'PRIMITIVE') state[key] = node.value;

      if (node.modifiers) {
        Object.keys(node.modifiers).forEach(modifier => {
          state[modifier] = node.modifiers[modifier];
        })
      }
    })

    return state;
  }
}

module.exports = SiloNode;