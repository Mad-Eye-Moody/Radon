// import state class for instanceof check
const ConstructorNode = require('./constructorNode.js');
const SiloNode = require('./siloNode.js');
const types = require('./constants.js');
const VirtualNode = require('./virtualNode.js');
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

const silo = {};       //more detailed and less encapsulated silo that Radon interacts with
const virtualSilo = {} //simplified version of the silo that the developer is exposed to

function combineNodes(...args) {
  if (args.length === 0) throw new Error('combineNodes function takes at least one constructorNode');

  // hastable accounts for passing in constructorNodes in any order. 
  // hashtable organizes all nodes into parent-child relationships
  const hashTable = {};
  args.forEach(constructorNode => {
    if (constructorNode.parent === null) {
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
  

  

  // applyToSilo(node => {
  //   if (node.type === types.OBJECT || node.type === types.ARRAY) {
  //     node.modifiers.keySubscribe = (key, ComponentToBind) => {
  //       const name = node.name + "_" + key;
  //       return class Component extends React.Component {
  //           constructor() {
  //             super();

  //             this.updateComponent = this.updateComponent.bind(this);
  //           }

  //           render() {
  //             let newState = {};
  //             if (this.updatedState) {
  //               newState = this.updatedState;
  //             }
  //             return (<ComponentToBind {...this.props} {...newState} />);
  //           }

  //           updateComponent(updatedState) {
  //               this.updatedState = updatedState;
  //               this.forceUpdate();
  //           }

  //           componentWillMount () {
  //             node.value[name].subscribers.push(this.updateComponent);
  //             node.value[name].notifySubscribers();
  //           }
  //       }
  //     }
  //   }
  // }

      function identify () {
        //each node's ID is a snake_case string that represents a 
        //route to that node from the top of the silo by name
        applyToSilo(node => {
          node.issueID()
        });
      }
      identify();

      function virtualize () { //runs through each node in the tree, turns it into a virtual node in the vSilo
        console.log('Virtualizing!');

        applyToSilo(node => {
          if(!virtualSilo[node.id]){
            const vNode = new VirtualNode;
            vNode.name = node.name;
  
            //each node is indexed in the virtualSilo at its ID
            virtualSilo[node.id] = vNode;
            vNode.type = node.type;

            if(!!node.modifiers){
              Object.keys(node.modifiers).forEach(key => {
                vNode[key] = node.modifiers[key];
              })
            }

            if(node.type !== 'PRIMITIVE'){
              //value should be an object, because you have children, and you need somewhere to recieve them!
              vNode.value = {}
            }

            //each node points to its parent in the virtual silo
            if(node.parent === null) console.log('found null parent node!');
            else {
              vNode.parent = virtualSilo[node.parent.id]
              if(node.type !== 'CONTAINER'){
                vNode.parent.value[vNode.name] = vNode;
              }
            }
            
            
            //each node has the id of its corresponding silo node
            vNode.id = node.id;
          }
        })
      }
      virtualize();
      silo.virtualSilo = virtualSilo;

      return silo;
    }

    

function applyToSilo(callback) {
  // accessing the single root in the silo
  Object.keys(silo).forEach(siloNodeRootKey => {
    inner(silo[siloNodeRootKey], callback);
  })

  function inner (head, callback) {
    if(head instanceof SiloNode){
      callback(head);
    }
    if (head.type === 'PRIMITIVE') return; // recursive base case
    else {
      Object.keys(head.value).forEach(key => {
        if(head.value[key] instanceof SiloNode){
          inner(head.value[key], callback);
        }
      })
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

silo.subscribe = (renderFunction, name) => { //renderFunction

  if(!name){
    if(!!renderFunction.prototype){
      name = renderFunction.prototype.constructor.name + 'STATE';
    } else {
      throw new Error('You can\'t use an anonymous function in subscribe without a name argument.'); //use new
    }
  }

  let foundNode;
  let subscribedAtIndex;

  applyToSilo(node => {
    if(node.name === name){
      subscribedAtIndex = node.pushToSubscribers(renderFunction)
      foundNode = node
    }
  })

  function unsubscribe () {
    foundNode.removeFromSubscribersAtIndex(subscribedAtIndex);
  }

  return unsubscribe;
}

// export default combineNodes;
module.exports = combineNodes;






