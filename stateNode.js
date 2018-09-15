class StateNode {
  constructor(name) {
    this.name = name;
    this.state = {};
    this.parent = null;

    this.initializeState = this.initializeState.bind(this);
    this.initializeModifiers = this.initializeModifiers.bind(this);
    this.setName = this.setName.bind(this);
    this.getName = this.getName.bind(this);
    this.setParent = this.setParent.bind(this);
    this.getParent = this.getParent.bind(this);
    this.getState = this.getState.bind(this);
  }

  initializeState(initialState) {
    if (typeof this.state !== 'object') throw new Error('input must be an object');
    Object.keys(initialState).forEach(key => {
      this.state[key] = {
        value: initialState[key],
        modifiers: this.state[key] ? this.state[key].modifiers : null // could be undefined
      }
    });
  }

  initializeModifiers(modifiers) {
    if (typeof modifiers !== 'object') throw new Error('input must be an object');
    Object.keys(modifiers).forEach(key => {
      this.state[key] = {
        value: this.state[key] ? this.state[key].value : null, // could be undefined
        modifiers: modifiers[key]
      }
    });
  }

  setName(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  setParent(parent) {
    this.parent = parent;
  }

  getParent() {
    return this.parent;
  }

  getState() {
    return this.state;
  }
}

module.exports = StateNode;

// developer side example

// import State from _____

// const AppState = new State('AppState');
// AppState.setName('AppState') -> optional if not set in constructor
// AppState.setParent('ParentNode');

// AppState.initializeState({
//   name: 'Han',
//   age: 25,
//   cart: []
// })

// AppState.initializeModifiers({
//   name: {
//     updateName: (current, payload) => {
//       return payload + current;
//     },
//     resetName: (current, payload) => {
//       return null;
//     }
//   },
//   age: {
//     incrementAge: (current, payload) => {
//       return current + 1;
//     },
//     decrementAge: (current, payload) => {
//       return current - 1;
//     }
//   },
//   cart: {
    // incrementShirts: (current, index, payload) => {
    //   return {
    //     value: ++current,
    //     index: index
    //   }
    // }
//   }
// });