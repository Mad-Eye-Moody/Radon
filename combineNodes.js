// import state class for instanceof check
const StateNode = require('./stateNode.js');
const SiloNode = require('./SiloNode.js');

// ==================> SILO TESTING <=================== \\

const AppState = new StateNode('AppState');
// AppState.name = 'AppState'; -> optional if not set in constructor

AppState.initializeState({
  name: 'Han',
  age: 25,
  cart: {one:1, two:2}
})

AppState.initializeModifiers({
  age: {
    incrementAge: (current, payload) => {
      return current + payload;
    }
  },
  cart: {
    increment: (current, index, payload) => {
      return ++current;
    },
    addItem: (current, payload) => {
      return current.push(payload);
    }
  }
});

const NavState = new StateNode('NavState');
NavState.parent = 'AppState';

NavState.initializeState({
  nav: 'Nav'
})

const ButtState = new StateNode('ButtState');
ButtState.parent = 'NavState';

ButtState.initializeState({
  butt: 'Butt'
})

//==================> SILO TESTING ENDED <===================\\

// ===========> async TEST stuff <========== \\

// function delay(time) {
//   return new Promise((resolve, reject) => {
//     setTimeout(resolve, time);
//   })
// }

// const nodeA = new SiloNode(5, null, {
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
  const node = new SiloNode(objChildren, parent, obj.modifiers, true);   // the true argument indicates that this is a parent object node
  const keys = Array.isArray(obj.value) ? obj : Object.keys(obj.value);
  
  if (Array.isArray(obj.value) && obj.value.length > 0) {
    obj.value.forEach((val, i) => {
      if (typeof val === 'object') objChildren[`${objName}_${i}`] = handleNestedObject(`${objName}_${i}`, {value: val}, node);
      else objChildren[`${objName}_${i}`] = new SiloNode(val, node);
    })
  } 
  
  else if (keys.length > 0) {
    keys.forEach(key => {
      if (typeof obj.value[key] === 'object') objChildren[`${objName}_${key}`] = handleNestedObject(key, {value: obj.value[key]}, node);
      else objChildren[`${objName}_${key}`] = new SiloNode(obj.value[key], node);
    })
  }

  return node;
}

// combineNodes takes all of the stateNodes created by the developer. It then creates SiloNodes from the
// stateNodes and organizes them into a single nested object, the silo

combineNodes = (...args) => {
  // you called this function without passing stuff? Weird
  if (args.length === 0) return;

  // maps the state nodes into a hashtable
  const hashTable = {};
  args.forEach(node => {
    // all nodes must be an instance of state node (must import state class)
    if (!(node instanceof StateNode)) throw new Error('only state objects can be passed into combineNodes');

    if (node.parent === null) {
      // only one node can be the root
      if (!hashTable.root) hashTable.root = [node];
      else throw new Error('only one state node can have null parent');
    } else {
      if (!hashTable[node.parent]) hashTable[node.parent] = [node];
      else hashTable[node.parent].push(node);
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
    const nodeName = (node === 'root') ? node : node.name;

    // if a piece of state has no children: recursive base case
    if (!hashTable[nodeName]) return;

    const allChildren = {};

    // inspect all children of the current state node
    hashTable[nodeName].forEach(child => {

      const nodeVal = {};
      allChildren[child.name] = new SiloNode(nodeVal, parent);
      const thisStateNode = child;
      const thisSiloNode = allChildren[child.name];
      const stateObj = child.state;

      // create SiloNodes for all the variables in the child state node
      Object.keys(stateObj).forEach(varName => {
        // handles non primitive data types
        if (typeof stateObj[varName].value === 'object') {
          nodeVal[varName] = handleNestedObject(varName, stateObj[varName], thisSiloNode);
        }
        // primitives only
        else nodeVal[varName] = new SiloNode(stateObj[varName].value, thisSiloNode, stateObj[varName].modifiers);
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

combineNodes(ButtState, NavState, AppState); // testing purposes

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