class SiloNode {
  constructor(val, parent = null, modifiers = {}) {
    this._value = val;
    this._modifiers = modifiers;
    this._queue = [];
    this._subscribers = [];
    this._parent = parent; // circular silo node

    // bind
    this.linkModifiers = this.linkModifiers.bind(this);
    this.runModifiers = this.runModifiers.bind(this);

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

  runModifiers() {
    let running = false; // prevents multiple calls from being made if already running

    async function run() {
      if (running === false) { // prevents multiple calls from being made if already running
        running = true;
  
        while (this.queue.length > 0) {
          this.value = await this.queue.shift()();
          // tell subscribers!!!
          console.log("in while loop", this.value); // test purposes only
        }              
      } else {
        return 'in progress...';
      }
    }
    return run;
  };

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
}

module.exports = SiloNode;