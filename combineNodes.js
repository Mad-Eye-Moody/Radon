// import state class for instanceof check
const ConstructorNode = require('./constructorNode.js');
const SiloNode = require('./siloNode.js');
const types = require('./constants.js');

// import state class for instanceof check
// import ConstructorNode from './constructorNode.js';
// import SiloNode from './siloNode.js';
// import * as types from './constants.js'

// ==================> SILO TESTING <=================== \\

// const AppState = new ConstructorNode('AppState');

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

// const NavState = new ConstructorNode('NavState', 'AppState');

// NavState.initializeState({
//   name: 'Han',
//   cart: {one: 1, array: [1,2,3, {test: 'test'}]}
//   // cart: [{two: 2, three: [1,2,3]}, 5, 10]
// })

// NavState.initializeModifiers({
//   cart: {
//     updateCartItem: (current, index, payload) => {
//       return ++current;
//     },
//     addItem: (current, payload) => {
//       current.newThing = 'A new thing';
//       // current.push(payload);
//       return current;
//     }
//   }
// });

// const ButtState = new ConstructorNode('ButtState');
// ButtState.parent = 'NavState';

// ButtState.initializeState({
//   butt: 'Butt'
// })

//==================> SILO TESTING ENDED <===================\\

const silo = {};

/**
 * Takes all of the constructorNodes created by the developer
 * @param  {...ConstructorNode} args - A list of constructor Nodes
 */

function combineNodes(...args) {
  if (args.length === 0) throw new Error('combineNodes function takes at least one constructorNode');

  // hastable accounts for passing in constructorNodes in any order. 
  // hashtable organizes all nodes into parent-child relationships
  const hashTable = {};
  args.forEach(constructorNode => {
    if (!constructorNode || constructorNode.constructor.name !== 'ConstructorNode') throw new Error('Only constructorNodes can be passed to combineNodes');
    else if (constructorNode.parent === null) {
      // this is the root node, only one constructorNode can have a parent of null
      if (!hashTable.root) hashTable.root = [constructorNode];
      else throw new Error('Only one constructor node can have null parent');
    } else {
      if (!hashTable[constructorNode.parent]) hashTable[constructorNode.parent] = [constructorNode];
      // if parent already exists, and node being added will append to the array of children
      else hashTable[constructorNode.parent].push(constructorNode);
    }
  }) 

  // ensure there is a defined root
  if (!hashTable.root) throw new Error('At least one constructor node must have a null parent');

  // recursive function that will create siloNodes and return them to a parent
  function mapToSilo(constructorNode = 'root', parentConstructorNode = null) {
    const constructorNodeName = (constructorNode === 'root') ? 'root' : constructorNode.name;

    // recursive base case, we only continue if the constructorNode has constructorNode children
    if (!hashTable[constructorNodeName]) return;

    const children = {};

    // loop through the children of constructorNode
    hashTable[constructorNodeName].forEach(currConstructorNode => {
      const valuesOfCurrSiloNode = {};
      children[currConstructorNode.name] = new SiloNode(currConstructorNode.name, valuesOfCurrSiloNode, parentConstructorNode, {}, types.CONTAINER);
      
      // abstract some variables
      const currSiloNode = children[currConstructorNode.name];
      const stateOfCurrConstructorNode = currConstructorNode.state;

      // create SiloNodes for all the variables in the currConstructorNode
      Object.keys(stateOfCurrConstructorNode).forEach(varInConstructorNodeState => {
        // creates siloNodes for object variables
        if (typeof stateOfCurrConstructorNode[varInConstructorNodeState].value === 'object') {
          valuesOfCurrSiloNode[varInConstructorNodeState] = currSiloNode.deconstructObjectIntoSiloNodes(varInConstructorNodeState, stateOfCurrConstructorNode[varInConstructorNodeState], currSiloNode, true);
        }
        // creates siloNodes for primitive variables
        else {
          valuesOfCurrSiloNode[varInConstructorNodeState] = new SiloNode(varInConstructorNodeState, stateOfCurrConstructorNode[varInConstructorNodeState].value, currSiloNode, stateOfCurrConstructorNode[varInConstructorNodeState].modifiers);
          valuesOfCurrSiloNode[varInConstructorNodeState].linkModifiers();
        }
      })

      // recursively check to see if the current constructorNode/siloNode has any children 
      const siloNodeChildren = mapToSilo(currConstructorNode, currSiloNode);
      if (siloNodeChildren) { 
        Object.keys(siloNodeChildren).forEach(siloNode => {
          valuesOfCurrSiloNode[siloNode] = siloNodeChildren[siloNode];
        })
      }
    })
    return children;
  }

  // rootState
  const wrappedRootSiloNode = mapToSilo();

  // will always only be a single key (the root) that is added into the silo
  Object.keys(wrappedRootSiloNode).forEach(rootSiloNode => {
    silo[rootSiloNode] = wrappedRootSiloNode[rootSiloNode];
  });
  
  forEachSiloNode(node => {
    // apply keySubscribe only to object and array silo nodes
    if (node.type === 'OBJECT' || node.type === "ARRAY") {
      node.modifiers.keySubscribe = (key, renderFunc) => {
        const name = node.name + "_" + key;
        const subscribedAtIndex = node.value[name].pushToSubscribers(renderFunc);
        node.value[name].notifySubscribers();
        return () => {node.removeFromSubscribersAtIndex(subscribedAtIndex)}
      }
    }
  });

  return silo;
}

/**
 * Applies the callback to every siloNode in the silo
 * @param {function} callback - A function that accepts a siloNode as its parameter
 */

// callbacks have to accept a SILONODE
function forEachSiloNode(callback) {
  // accessing the single root in the silo
  Object.keys(silo).forEach(siloNodeRootKey => {
    inner(silo[siloNodeRootKey], callback);
  })

  // recursively navigate to every siloNode
  function inner(head, callback) {
    if (head.constructor.name === 'SiloNode') {
      callback(head);
      if (head.type === types.PRIMITIVE) return; // recursive base case
      
      else {
        Object.keys(head.value).forEach(key => {
          if (head.value[key].constructor.name === 'SiloNode') {
            inner(head.value[key], callback);
          }
        })
      }
    }
  }
}

// combineNodes(ButtState, NavState, AppState); // testing purposes
// // combineNodes(AppState, NavState); // testing purposes

// setTimeout(() => {console.log('delay', silo.AppState.value.NavState.getState())}, 1000);
// setTimeout(() => {console.log('Im adding again', silo.AppState.value.NavState.getState().addItem({six: 6}))}, 1001);
// setTimeout(() => {console.log('delay', silo.AppState.value.NavState.getState())}, 1010);


// ==========> TESTS that calling a parent function will modify its child for nested objects <========== \\

// console.log(silo.AppState.value.cart.value.cart_one.value);
// silo.AppState.value.cart.modifiers.increment('cart_one');
// setTimeout(() => {
//   console.log(silo.AppState.value.cart.value.cart_one.value);
// }, 1000);

// ==========> END TESTS that calling a parent function will modify its child for nested objects <========== \\

/**
 * Subscribes components to siloNodes in the silo
 * @param  {function} renderFunction - Function to be appended to subscribers array
 * @param {string} name - Name of the relevant component with 'State' appended
 */

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

// renderFunction takes a siloNode argument
// silo.subscribe = (renderFunction, name) => {

//   if (!name) {
//     if (!!renderFunction.prototype) {
//       name = renderFunction.prototype.constructor.name + 'State';
//     } else {
//       throw new Error('You can\'t use an anonymous function in subscribe without a name argument.');
//     }
//   }

//   let foundNode;
//   let subscribedAtIndex;

//   forEachSiloNode(node => {
//     if (node.name === name) {
//       // change to node.subscribers.push(renderFunction);
//       // renderFunction 'this' is bound to a React component
//       subscribedAtIndex = node.pushToSubscribers(renderFunction);
//       foundNode = node;
//     }
//   })
  
//   function unsubscribe() {
//     foundNode.removeFromSubscribersAtIndex(subscribedAtIndex);
//   }

//   if (!!foundNode) {
//     renderFunction(foundNode.getState())
//   } else {
//     console.error(new Error('You are trying to subscribe to something that isn\'t in the silo.'));
//   }

//   return unsubscribe;
// }

// export default combineNodes;
module.exports = combineNodes;