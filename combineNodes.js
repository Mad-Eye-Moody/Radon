// import state class for instanceof check
const StateNode = require('./stateNode.js');
const SiloNode = require('./SiloNode.js');

// import state class for instanceof check
// import StateNode from './stateNode.js';
// import SiloNode from './siloNode.js';

// ==================> SILO TESTING <=================== \\

// const AppState = new StateNode('AppState');
// // AppState.name = 'AppState'; -> optional if not set in constructor

// AppState.initializeState({
//   name: 'Han',
//   age: 25
// })

// AppState.initializeModifiers({
//   age: {
//     incrementAge: (current, payload) => {
//       return current + payload;
//     }
//   }
// });

// const NavState = new StateNode('NavState');
// NavState.parent = 'AppState';

// NavState.initializeState({
//   cart: []
// })

// NavState.initializeModifiers({
//   cart: {
//     increment: (current, index, payload) => {
//       return ++current;
//     },
//     addItem: (current, payload) => {
//       current.push(payload);
//       return current;
//     }
//   }
// });

// const ButtState = new StateNode('ButtState');
// ButtState.parent = 'NavState';

// ButtState.initializeState({
//   butt: 'Butt'
// })

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
  let type, keys;

  // determine if array or other object
  if (Array.isArray(obj.value)) {
    keys = obj.value;
    type = 'ARRAY';
  } else {
    keys = Object.keys(obj.value);
    type = 'OBJECT'
  }

  const node = new SiloNode(objChildren, parent, obj.modifiers, type);
  
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

  // method below created to ensure that all values have been added to the objChild before
  // modifiers are linked (needed for objects)
  node.runLinkModifiers(objName); // this one is fine
  return node;
}

// combineNodes takes all of the StateNodes created by the developer. It then creates SiloNodes from the
// StateNodes and organizes them into a single nested object, the silo

function combineNodes(...args) {
  // you called this function without passing stuff? Weird
  if (args.length === 0) return;

  // maps the state nodes into a hashtable
  const hashTable = {};
  args.forEach(node => {
    // all nodes must be an instance of state node (must import state class)
    //console.log(node, node instanceof StateNode);
    //if (!(node instanceof StateNode)) throw new Error('only state objects can be passed into combineNodes');

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
      allChildren[child.name] = new SiloNode(nodeVal, parent, {}, 'NESTEDSTATE');
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

  return silo;
}

// combineNodes(ButtState, NavState, AppState); // testing purposes
// combineNodes(AppState, NavState); // testing purposes
// console.log("beginning case", silo.AppState.value.cart);
// silo.AppState.value.cart.modifiers.addItem({two: 2});
// silo.AppState.value.cart.modifiers.addItem({three: 3});

// setTimeout(() => console.log("end case", silo.AppState.value.cart), 1000);

// console.log(silo.AppState.getState());
// silo.AppState.value.NavState.value.cart.subscribers.push((state) => {console.log('STATE', state)});
// silo.AppState.value.NavState.value.cart.modifiers.addItem({two: 2});

// silo.AppState.value.cart.modifiers.addItem({two: 3, five: 5});
// setTimeout(() => {console.log('delay', silo.AppState.value.NavState.getState())}, 1000);
// setTimeout(() => {console.log('Im adding', silo.AppState.value.NavState.getState().addItem({five: 5}))}, 1001);
// setTimeout(() => {console.log('Im adding again', silo.AppState.value.NavState.getState().addItem({six: 6}))}, 1001);

// ==========> TESTS that calling a parent function will modify its child for nested objects <========== \\

// console.log(silo.AppState.value.cart.value.cart_one.value);
// silo.AppState.value.cart.modifiers.increment('cart_one');
// setTimeout(() => {
//   console.log(silo.AppState.value.cart.value.cart_one.value);
// }, 1000);

// ==========> END TESTS that calling a parent function will modify its child for nested objects <========== \\

silo.subscribe = (component, name) => {
  if(!name && !component.prototype){
      throw Error('you cant use an anonymous function in subscribe without a name argument');
  } else if (!name && !!component.prototype){
      name = component.prototype.constructor.name + 'State'
  }
  
  const searchSilo = (head, name) => {
      let children;
      if(typeof head.value !== 'object') return null;
      else children = head.value;

      for(let i in children){
          if(i === name){
              return children[i]
          } else {
              let foundNode = searchSilo(children[i], name);
              if(!!foundNode){return foundNode};
          }
      }
  }

  console.log('Searching for', name);
  let foundNode;
  for(let i in silo){
    if(silo[i].constructor === SiloNode){
      if(i === name) {
        foundNode = silo[i];
      } else {
        foundNode = searchSilo(silo[i], name)
      }
      if(!!foundNode){
        foundNode._subscribers.push(component)
        if(typeof foundNode.value === 'object'){
          for(let i in foundNode.value){
            if(i.slice(-5) !== 'State'){
              foundNode.value[i]._subscribers.push(component);
            }
          }
        }
      }
    }
  }
  
  if(foundNode) {
    component(foundNode.getState());    
  }

  return foundNode;

    //if there's no name assume the name is component name + 'State'
    //recursively search through silo from headnode
    //find something with name === name;
    //add to its subscribers the component;
}

// export default combineNodes;
module.exports = combineNodes;
