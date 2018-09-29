const combineNodes = require('../combineNodes.js');
const ConstructorNode = require('../constructorNode.js');
const SiloNode = require('../siloNode.js');

describe('The combineNodes function', () => {
  let AppState, NavState, MainState, silo;

  beforeAll(() => {

    AppState = new ConstructorNode('AppState');
    AppState.initializeState({
      name: 'App',
      age: 25
    })
    AppState.initializeModifiers({
      age: {
        incrementAge: (current, payload) => {
          return current + payload;
        }
      }
    });

    NavState = new ConstructorNode('NavState', 'AppState');
    NavState.initializeState({
      name: 'Nav',
      cart: {one: 1, array: [1,2,3, {test: 'test'}]}
    })
    NavState.initializeModifiers({
      cart: {
        updateCartItem: (current, index, payload) => {
          return ++current;
        },
        addItem: (current, payload) => {
          current.push(payload);
          return current;
        }
      }
    });

    MainState = new ConstructorNode('MainState', 'NavState');
    MainState.parent = 'NavState';
    MainState.initializeState({
      name: 'Main'
    })

  })

  it('should only accept constructorNodes', () => {
    expect(() => combineNodes()).toThrowError('combineNodes function takes at least one constructorNode');
    expect(() => combineNodes('flowers')).toThrowError('Only constructorNodes can be passed to combineNodes');
    expect(() => combineNodes(AppState, 2)).toThrowError('Only constructorNodes can be passed to combineNodes');
    expect(combineNodes(AppState, NavState)).toBeTruthy();
  })
  it('should assert only one constructorNode have a null parent', () => {
    expect(() => combineNodes(AppState, new ConstructorNode('test'))).toThrowError('Only one constructor node can have null parent');
    expect(() => combineNodes(MainState, NavState)).toThrowError('At least one constructor node must have a null parent');
  })
  it('should return an object', () => {
    silo = combineNodes(AppState, NavState, MainState);
    expect(silo).toBeInstanceOf(Object);
  })

  describe('the silo object', () => {
    it('silo should have a single root siloNode', () => {
      expect(Object.keys(silo).length).toBe(2);
    })
    it('the root state should have a value with 3 keys', () => {
      expect(Object.keys(silo.AppState.value).length).toBe(3);
    })
    // it('subscribe function calls render once and enforces naming convention', () => {
    //   const mockRender = jest.fn(sN => {});
    //   silo.subscribe(mockRender, 'AppState');
    //   expect(mockRender.mock.calls.length).toBe(1);
    //   expect(() => silo.subscribe(mockRender, 'App')).toThrowError('You are trying to subscribe to something that isn\'t in the silo.');
    //   expect(() => silo.subscribe()).toThrowError('Must pass parameters');
    // })
  })
})