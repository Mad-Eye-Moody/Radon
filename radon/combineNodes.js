// import state class for instanceof check
import ConstructorNode from './constructorNode.js';
import SiloNode from './siloNode.js';
import * as types from './constants.js'
import virtualNode from './virtualNode.js'

const silo = {};
const virtualSilo = {};

/**
 * Takes all of the constructorNodes created by the developer and turns them into the silo
 * @param  {...ConstructorNode} args - A list of constructor Nodes
 */

function combineNodes(...args) {
  let devTool = null;
  if(args[0] && args[0].devTool === true) {
    devTool = args[0];
    args.shift();
  }
  if (args.length === 0) throw new Error('combineNodes function takes at least one constructorNode');

  // hastable accounts for passing in constructorNodes in any order. 
  // hashtable organizes all nodes into parent-child relationships so the silo is easier to create
  const hashTable = {};

  // loop through the constructorNodes passed in as arguments
  args.forEach(constructorNode => {
    if (!constructorNode || constructorNode.constructor.name !== 'ConstructorNode') throw new Error('Only constructorNodes can be passed to combineNodes');
    // a node with a null parent will be the root node, and there can only be one
    else if (constructorNode.parent === null) {
      // we check to see if the root key already exists in the hashtable. If so, this means a root
      // has already been established
      if (!hashTable.root) hashTable.root = [constructorNode];
      else throw new Error('Only one constructor node can have null parent');
    } 
    // if the parent isn't null, then the parent is another node
    else {
      // if the parent doesn't exist as a key yet, we will create the key and set it to an array
      // that can be filled with all possible children
      if (!hashTable[constructorNode.parent]) hashTable[constructorNode.parent] = [constructorNode];
      // if parent already exists, and node being added will append to the array of children
      else hashTable[constructorNode.parent].push(constructorNode);
    }
  }) 

  // ensure there is a defined root before continuing
  if (!hashTable.root) throw new Error('At least one constructor node must have a null parent');

  // a recursive function that will create siloNodes and return them to a parent
  function mapToSilo(constructorNode = 'root', parentConstructorNode = null) {
    // the very first pass will set the parent to root
    const constructorNodeName = (constructorNode === 'root') ? 'root' : constructorNode.name;

    // recursive base case, we only continue if the current node has any constructorNode children
    if (!hashTable[constructorNodeName]) return;

    const children = {};

    // loop through the children arrays in the hashtable
    hashTable[constructorNodeName].forEach(currConstructorNode => {
      const valuesOfCurrSiloNode = {};
      children[currConstructorNode.name] = new SiloNode(currConstructorNode.name, valuesOfCurrSiloNode, parentConstructorNode, {}, types.CONTAINER, devTool);
      
      // abstract some variables
      const currSiloNode = children[currConstructorNode.name];
      const stateOfCurrConstructorNode = currConstructorNode.state;

      // create SiloNodes for all the variables in the currConstructorNode
      Object.keys(stateOfCurrConstructorNode).forEach(varInConstructorNodeState => {
        // is the variable is an object/array, we need to deconstruct it into further siloNodes
        if (typeof stateOfCurrConstructorNode[varInConstructorNodeState].value === 'object') {
          valuesOfCurrSiloNode[varInConstructorNodeState] = currSiloNode.deconstructObjectIntoSiloNodes(varInConstructorNodeState, stateOfCurrConstructorNode[varInConstructorNodeState], currSiloNode, true);
        }
        // otherwise primitives can be stored in siloNodes and the modifiers run
        else {
          valuesOfCurrSiloNode[varInConstructorNodeState] = new SiloNode(varInConstructorNodeState, stateOfCurrConstructorNode[varInConstructorNodeState].value, currSiloNode, stateOfCurrConstructorNode[varInConstructorNodeState].modifiers, types.PRIMITIVE, devTool);
          valuesOfCurrSiloNode[varInConstructorNodeState].linkModifiers();
        }
      })

      // recursively check to see if the current constructorNode/siloNode has any children 
      const siloNodeChildren = mapToSilo(currConstructorNode, currSiloNode);
      // if a Node did have children, we will add those returned siloNodes as values
      // into the current siloNode
      if (siloNodeChildren) { 
        Object.keys(siloNodeChildren).forEach(siloNode => {
          valuesOfCurrSiloNode[siloNode] = siloNodeChildren[siloNode];
        })
      }
    })
    return children;
  }

  // here we will get the root siloNode with all its children added
  const wrappedRootSiloNode = mapToSilo();

  // add the siloNode root to the plain silo object
  // it will always only be a single key (the root) that is added into the silo
  Object.keys(wrappedRootSiloNode).forEach(rootSiloNode => {
    silo[rootSiloNode] = wrappedRootSiloNode[rootSiloNode];
  });
  
  function identify () {
    //each node's ID is a snake_case string that represents a 
    //route to that node from the top of the silo by name
    forEachSiloNode(node => {
      node.issueID()
    });
  }

  identify();

  function virtualize () { //runs through each node in the tree, turns it into a virtual node in the vSilo
    forEachSiloNode(node => {
      if(!virtualSilo[node.id]){
        virtualSilo[node.id] = node.virtualNode;
      }
    })
  }

    virtualize();
      
    
    forEachSiloNode(node => {
      // apply keySubscribe only to object and array silo nodes
      if (node.type === 'OBJECT' || node.type === "ARRAY") {
        node.modifiers.keySubscribe = (key, renderFunc) => {
          const name = node.name + "_" + key;
          const subscribedAtIndex = node.value[name].pushToSubscribers(renderFunc);
          node.value[name].notifySubscribers();
          return () => {node.removeFromSubscribersAtIndex(subscribedAtIndex)}
        }
      }})
    
    

  
  silo.virtualSilo = virtualSilo;
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

/**
 * Subscribes components to siloNodes in the silo
 * @param  {function} renderFunction - Function to be appended to subscribers array
 * @param {string} name - Name of the relevant component with 'State' appended
 */

silo.subscribe = (renderFunction, name) => {
  if (!name) {
    if (!!renderFunction.prototype) {
      name = renderFunction.prototype.constructor.name + 'State';
    } else {
      throw new Error('You can\'t use an anonymous function in subscribe without a name argument.');
    }
  }

  let foundNode;
  let subscribedAtIndex;
  const foundNodeChildren = [];

  forEachSiloNode(node => {
    if(node.name === name){
      subscribedAtIndex = node.pushToSubscribers(renderFunction)
      foundNode = node
      foundNodeChildren.push({node: foundNode, index: subscribedAtIndex});
    }
  })

  let unsubscribe;
  
  if (!!foundNode) {
    
    
    if (foundNode.value) {
      Object.keys(foundNode.value).forEach(key => {
        let node = foundNode.value[key];
        if(node.type !== 'CONTAINER'){
          subscribedAtIndex = node.pushToSubscribers(renderFunction);
          foundNodeChildren.push({node: node, index: subscribedAtIndex});
  
        }
      })
    }

    unsubscribe = () =>  {
      let ob;
      Object.keys(foundNodeChildren).forEach(key => {
        ob = foundNodeChildren[key]; 
        ob._subscribers.splice(ob.index, 1)
      })
    }


    foundNode.notifySubscribers();
    return unsubscribe;

  } else {
    console.error(new Error('You are trying to subscribe to something that isn\'t in the silo.'));
    return function errFunc () {
      console.error(new Error('You are trying to run unsubscribe from something that wasn\'t in the silo in the first place.'))
    }
  }

}

export default combineNodes;