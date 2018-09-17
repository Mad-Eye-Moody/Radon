class StateNode {
  constructor(name) {
    this._name = name;
    this._state = {};
    this._parent = null;

    this.initializeState = this.initializeState.bind(this);
    this.initializeModifiers = this.initializeModifiers.bind(this);
  }

  initializeState(initialState) {
    if (typeof this._state !== 'object') throw new Error('input must be an object');
    Object.keys(initialState).forEach(key => {
      this._state[key] = {
        value: initialState[key],
        modifiers: this._state[key] ? this._state[key].modifiers : null // could be undefined
      }
    });
  }

  initializeModifiers(modifiers) {
    if (typeof modifiers !== 'object') throw new Error('input must be an object');
    Object.keys(modifiers).forEach(key => {
      this._state[key] = {
        value: this._state[key] ? this._state[key].value : null, // could be undefined
        modifiers: modifiers[key]
      }
    });
  }

  set name(name) {
    this._name = name;
  }

  get name() {
    return this._name;
  }

  set parent(parent) {
    this._parent = parent;
  }

  get parent() {
    return this._parent;
  }

  get state() {
    return this._state;
  }
}

module.exports = StateNode;

// developer side example

// import State from _____

// const AppState = new StateNode('AppState');
// // AppState.name = 'AppState'; -> optional if not set in constructor
// AppState.parent = 'ParentNode';

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
//     incrementShirts: (current, index, payload) => {
//       return ++current;
//     },
//     addItem: (current, payload) => {
//       return current.push(payload);
//     }
//   }
// });