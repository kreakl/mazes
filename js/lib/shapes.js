import { buildSquareGrid } from './maze.js';

import {
    SHAPE_SQUARE
} from './constants.js';

export const shapes = {
    [SHAPE_SQUARE]: {
        build: buildSquareGrid
    }
};