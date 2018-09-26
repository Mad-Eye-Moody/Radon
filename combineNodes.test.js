const ConstructorNode = require('./constructorNode.js');
const combineNodes = require('./combineNodes.js');

describe('Initialize State', () => {
    const PersonState = new ConstructorNode('PersonState', 'ColorState');
    PersonState.initializeState({
        name: ["Michael", "Laythe"],
        age: 19
    })

    const ColorState = new ConstructorNode('ColorState');
    ColorState.initializeState({
        red: ['crimson', 'ruby', 'scarlet', 'cherry'],
        blue: ['sapphire', 'navy', 'sky', 'baby'],
        green: ['chartreuse', 'ivy', 'teal', 'emerald']
    })

    PersonState.initializeModifiers({
        age: {
            haveBirthday: (payload, previous) => {
                return previous + 1;
            }
        }
    })

    // const BlimpState = new ConstructorNode('HelenState', 'ColorState')
    // BlimpState.initializeState({
    //     take:{a:{ride:{in:{my:{blimp: 'its a', very:{strong:'blimp'}}}}}}
    // })

    let silo = combineNodes(PersonState, ColorState,/*BlimpState*/);

    // for(let i in silo.virtualSilo){
    //     console.log(silo.virtualSilo[i])
    //     if(silo.virtualSilo[i].type === 'CONTAINER'){
    //         console.log(silo.virtualSilo[i])
    //     }
    // };

    console.log(silo.virtualSilo['ColorState.PersonState'])

    test('ID\'s should represent the lineage of the node in the silo', () => {
        expect(silo['ColorState'].value['red'].value['red_2'].id).toBe('ColorState.red.red_2')
        expect(silo['ColorState'].value['blue'].value['blue_0'].id).toBe('ColorState.blue.blue_0')
        expect(silo['ColorState'].value['PersonState'].value['name'].id).toBe('ColorState.PersonState.name')
    })



})



