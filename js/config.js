import {ALGORITHM_RECURSIVE_BACKTRACK} from './lib/constants.js';

export const config = Object.freeze({
    shapes: {
        'square': {
            description: 'Square Grid',
            parameters: {
                width: {
                    min: 2,
                    max: 50,
                    initial: 30
                },
                height: {
                    min: 2,
                    max: 50,
                    initial: 30
                }
            },
            defaultAlgorithm: ALGORITHM_RECURSIVE_BACKTRACK
        },
    }
});