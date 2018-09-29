class ConstructorNode {
  constructor(name, parentName = null) {
    this.name = name; 
    this.state = {};
    this.parent = parentName;
    
    this.initializeState = this.initializeState.bind(this);
    this.initializeModifiers = this.initializeModifiers.bind(this);
  }

  /**
   * Adds variables to the state
   * @param {object} initialState - An object with keys as variable names and values of data
   */

  initializeState(initialState) {
    // make sure that the input is an object
    if (typeof initialState !== 'object' || Array.isArray(initialState)) throw new Error('Input must be an object');
    // loop through the state variables
    Object.keys(initialState).forEach(newVariableInState => {
      this.state[newVariableInState] = {
        value: initialState[newVariableInState],
        //accounts for itializeModifers being called prior to initializeState. 
        modifiers: this.state[newVariableInState] ? this.state[newVariableInState].modifiers : {}
      }
    });
  }

  /**
   * Stores modifiers in state
   * @param {object} initialModifiers - An object with keys associated with existing initialized variables and values that are objects containing modifiers to be bound to that specific variable
   */
  
  initializeModifiers(initialModifiers) {
    // make sure that the input is an object
    if (typeof initialModifiers !== 'object' || Array.isArray(initialModifiers)) throw new Error('Input must be an object');
    // loop through the state modifiers
    Object.keys(initialModifiers).forEach(newModifiersInState => {
      this.state[newModifiersInState] = {
        //accounts for initializeState being called prior to initializeState. 
        value: this.state[newModifiersInState] ? this.state[newModifiersInState].value : null,
        modifiers: initialModifiers[newModifiersInState]
      }
    });
  }

  set name(name) {
    if (typeof name !== 'string') throw new Error('Name must be a string');
    else this._name = name;
  }

  get name() {
    return this._name;
  }

  set parent(parent) {
    if (typeof parent !== 'string' && parent !== null) throw new Error('Parent must be a string');
    else this._parent = parent;
  }

  get parent() {
    return this._parent;
  }

  set state(state) {
    this._state = state;
  }

  get state() {
    return this._state;
  }
}

// export default ConstructorNode;
module.exports = ConstructorNode;