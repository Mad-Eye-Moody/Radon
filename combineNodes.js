// import state class for instanceof check
const StateNode = require('./stateNode.js');

// ==================> SILO TESTING <=================== \\

// const AppState = new StateNode('AppState');
// // AppState.setName('AppState') -> optional if not set in constructor
// // AppState.setParent(null);

// AppState.initializeState({
//   name: 'Han',
//   age: 25,
//   cart: {one:1, two:2}
// })

// AppState.initializeModifiers({
//   age: {
//     incrementAge: (current, payload) => {
//       return current + payload;
//     }
//   },
//   cart: {
//     increment: (current, payload) => {
//       return ++current;
//     }
//   }
// });

// const NavState = new StateNode('NavState');
// NavState.setParent('AppState');

// NavState.initializeState({
//   nav: 'Nav'
// })

// const ButtState = new StateNode('ButtState');
// ButtState.setParent('NavState');

// ButtState.initializeState({
//   butt: 'Butt'
// })

//==================> SILO TESTING ENDED <===================\\

class siloNode {
  constructor(val, parent = null, modifiers = {}, isAnObject = false) {
    this.value = val;
    this.modifiers = modifiers;
    this.queue = [];
    this.subscribers = [];
    this.parent = parent; // circular silo node
    this.isAnObject = isAnObject; // controls the type of middleware

    // bind
    this.linkModifiers = this.linkModifiers.bind(this);
    this.runModifiers = this.runModifiers.bind(this);

    // invoke functions
    this.linkModifiers(this.modifiers);
    this.runQueue = this.runModifiers();
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
      else if (!this.isAnObject) {
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
      // adds middleware that will affect the value of a child node
      else if (this.isAnObject) {
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

// ===========> async TEST stuff <========== \\

// function delay(time) {
//   return new Promise((resolve, reject) => {
//     setTimeout(resolve, time);
//   })
// }

// const nodeA = new siloNode(5, null, {
//   increment: (current, payload) => {
//     return current + payload;
//   },

//   asyncIncrement: (current, payload) => {
//     return delay(500)
//     .then(() => {
//       const temp = current + payload;
//       return temp;
//     });
//   }
// });

// console.log(nodeA.value);
// nodeA.modifiers.asyncIncrement(10);
// nodeA.modifiers.increment(12);

// setTimeout(() => {
//   console.log(nodeA.value);
// }, 800);

// ===========> async TEST stuff end <========== \\

const silo = {};

// handles nested objects in state by converting every key/index into a node
// also it is recursive
// IMPORTANT nested object nodes are named after their parent and the key: ex: cart_one
function handleNestedObject(objName, obj, parent) {
  const objChildren = {};
  const node = new siloNode(objChildren, parent, obj.modifiers, true);   // the true argument indicates that this is a parent object node
  const keys = Array.isArray(obj.value) ? obj : Object.keys(obj.value);
  
  if (Array.isArray(obj.value) && obj.value.length > 0) {
    obj.value.forEach((val, i) => {
      if (typeof val === 'object') objChildren[`${objName}_${i}`] = handleNestedObject(`${objName}_${i}`, {value: val}, node);
      else objChildren[`${objName}_${i}`] = new siloNode(val, node);
    })
  } 
  
  else if (keys.length > 0) {
    keys.forEach(key => {
      if (typeof obj.value[key] === 'object') objChildren[`${objName}_${key}`] = handleNestedObject(key, {value: obj.value[key]}, node);
      else objChildren[`${objName}_${key}`] = new siloNode(obj.value[key], node);
    })
  }

  return node;
}

// combineNodes takes all of the stateNodes created by the developer. It then creates siloNodes from the
// stateNodes and organizes them into a single nested object, the silo

combineNodes = (...args) => {
  // you called this function without passing stuff? Weird
  if (args.length === 0) return;

  // maps the state nodes into a hashtable
  const hashTable = {};
  args.forEach(node => {
    // all nodes must be an instance of state node (must import state class)
    if (!(node instanceof StateNode)) throw new Error('only state objects can be passed into combineNodes');

    if (node.getParent() === null) {
      // only one node can be the root
      if (!hashTable.root) hashTable.root = [node];
      else throw new Error('only one state node can have null parent');
    } else {
      if (!hashTable[node.getParent()]) hashTable[node.getParent()] = [node];
      else hashTable[node.getParent()].push(node);
    }
  }) 

  // now we can more easily build the silo object
  if (!hashTable.root) {
    //problem we must address... ?
    throw new Error('at least one state node must have a null parent');
  }

  // recursively map to the silo (called below)
  function mapToSilo(node = 'root', parent = null) {

    // determine if node variable is root
    const nodeName = (node === 'root') ? node : node.getName();

    // if a piece of state has no children: recursive base case
    if (!hashTable[nodeName]) return;

    const allChildren = {};

    // inspect all children of the current state node
    hashTable[nodeName].forEach(child => {

      const nodeVal = {};
      allChildren[child.getName()] = new siloNode(nodeVal, parent);
      const thisStateNode = child;
      const thisSiloNode = allChildren[child.getName()];
      const stateObj = child.getState();

      // create siloNodes for all the variables in the child state node
      Object.keys(stateObj).forEach(varName => {
        // handles non primitive data types
        if (typeof stateObj[varName].value === 'object') {
          nodeVal[varName] = handleNestedObject(varName, stateObj[varName], thisSiloNode);
        }
        // primitives only
        else nodeVal[varName] = new siloNode(stateObj[varName].value, thisSiloNode, stateObj[varName].modifiers);
      })

      // recurse for grandbabiessss
      const babies = mapToSilo(thisStateNode, thisSiloNode);
      if (babies) {
        Object.keys(babies).forEach(baby => {
          nodeVal[baby] = babies[baby];
        })
      }
    })
    return allChildren;
  }

  // initiate recurse function
  const temp = mapToSilo();

  // will always only be a single key (the root) that is added into the silo
  Object.keys(temp).forEach(key => {
    silo[key] = temp[key];
  });
}

// combineNodes(ButtState, NavState, AppState); // testing purposes

// ==========> TESTS that calling a parent function will modify its child for nested objects <========== \\

// console.log(silo.AppState.value.cart.value.cart_one.value);
// silo.AppState.value.cart.modifiers.increment('cart_one');
// setTimeout(() => {
//   console.log(silo.AppState.value.cart.value.cart_one.value);
// }, 1000);

// ==========> END TESTS that calling a parent function will modify its child for nested objects <========== \\

module.exports = {
  silo,
  combineNodes
}