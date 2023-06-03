import {buildEventTarget} from './utils.js';
import {
    METADATA_DISTANCE, METADATA_PATH, METADATA_MAX_DISTANCE, METADATA_MASKED, METADATA_CURRENT_CELL, METADATA_UNPROCESSED_CELL,
    METADATA_START_CELL, METADATA_END_CELL, METADATA_PLAYER_CURRENT, METADATA_PLAYER_VISITED, METADATA_RAW_COORDS,
    EVENT_CLICK,
    DIRECTION_NORTH, DIRECTION_SOUTH, DIRECTION_EAST, DIRECTION_WEST,
    DIRECTION_NORTH_WEST, DIRECTION_NORTH_EAST, DIRECTION_SOUTH_WEST, DIRECTION_SOUTH_EAST,
    CELL_BACKGROUND_COLOUR, WALL_COLOUR, PATH_COLOUR, CELL_MASKED_COLOUR, CELL_CURRENT_CELL_COLOUR, CELL_UNPROCESSED_CELL_COLOUR,
    CELL_PLAYER_CURRENT_COLOUR, CELL_PLAYER_VISITED_COLOUR,
    EXITS_NONE, EXITS_HORIZONTAL, EXITS_VERTICAL, EXITS_HARDEST
} from './constants.js';

function getCellBackgroundColour(cell, grid) {
    const distance = cell.metadata[METADATA_DISTANCE];

    if (distance !== undefined) {
        return getDistanceColour(distance, grid.metadata[METADATA_MAX_DISTANCE]);

    } else if (cell.metadata[METADATA_MASKED]) {
        return CELL_MASKED_COLOUR;

    } else if (cell.metadata[METADATA_CURRENT_CELL]) {
        return CELL_CURRENT_CELL_COLOUR;

    } else if (cell.metadata[METADATA_UNPROCESSED_CELL]) {
        return CELL_UNPROCESSED_CELL_COLOUR;

    } else if (cell.metadata[METADATA_PLAYER_CURRENT]) {
        return CELL_PLAYER_CURRENT_COLOUR;

    } else if (cell.metadata[METADATA_PLAYER_VISITED]) {
        return CELL_PLAYER_VISITED_COLOUR;

    } else {
        return CELL_BACKGROUND_COLOUR;
    }
}

function findExitCells(grid) {
    const exitDetails = {};

    grid.forEachCell(cell => {
        let direction;
        if (direction = cell.metadata[METADATA_START_CELL]) {
            exitDetails[METADATA_START_CELL] = [cell, direction];
        }
        if (direction = cell.metadata[METADATA_END_CELL]) {
            exitDetails[METADATA_END_CELL] = [cell, direction];
        }
    });

    if (exitDetails[METADATA_START_CELL] && exitDetails[METADATA_END_CELL]) {
        return exitDetails;
    }
}

const exitDirectionOffsets = {
    [DIRECTION_NORTH] : {x: 0, y:-1},
    [DIRECTION_SOUTH] : {x: 0, y: 1},
    [DIRECTION_EAST]  : {x: 1, y: 0},
    [DIRECTION_WEST]  : {x:-1, y: 0},
    [DIRECTION_NORTH_WEST]  : {x:-1, y: -1},
    [DIRECTION_NORTH_EAST]  : {x: 0, y: -1},
    [DIRECTION_SOUTH_WEST]  : {x:-1, y:  1},
    [DIRECTION_SOUTH_EAST]  : {x: 0, y:  1},
};

const eventTarget = buildEventTarget('maze');

function buildBaseGrid(config) {
    "use strict";
    const cells = {}, {random} = config;

    function makeIdFromCoords(coords) {
        return coords.join(',');
    }
    function buildCell(...coords) {
        const id = makeIdFromCoords(coords);
        const cell = {
            id,
            coords,
            metadata: {},
            neighbours: {
                random(fnCriteria = () => true) {
                    return random.choice(this.toArray().filter(fnCriteria));
                },
                toArray(fnCriteria = () => true) {
                    return Object.values(this).filter(value => typeof value !== 'function').filter(fnCriteria);
                },
                linkedDirections() {
                    return this.toArray().filter(neighbour => neighbour.isLinkedTo(cell)).map(linkedNeighbour => Object.keys(this).find(direction => this[direction] === linkedNeighbour));
                }
            },
            isLinkedTo(otherCell) {
                return this.links.includes(otherCell);
            },
            links: []
        };
        return cell;
    }

    function removeNeighbour(cell, neighbour) {
        const linkIndex = cell.links.indexOf(neighbour);
        if (linkIndex >= 0) {
            cell.links.splice(linkIndex, 1);
        }
        Object.keys(cell.neighbours).filter(key => cell.neighbours[key] === neighbour).forEach(key => delete cell.neighbours[key]);
    }

    function removeNeighbours(cell) {
        cell.neighbours.toArray().forEach(neighbour => {
            removeNeighbour(cell, neighbour);
            removeNeighbour(neighbour, cell);
        });
    }

    return {

        forEachCell(fn) {
            Object.values(cells).forEach(fn);
        },
        getAllCellCoords() {
            const allCoords = [];
            this.forEachCell(cell => allCoords.push(cell.coords));
            return allCoords;
        },
        link(cell1, cell2) {
            console.assert(cell1 !== cell2);
            console.assert(Object.values(cell1.neighbours).includes(cell2));
            console.assert(!cell1.links.includes(cell2));
            console.assert(Object.values(cell2.neighbours).includes(cell1));
            console.assert(!cell2.links.includes(cell1));

            cell1.links.push(cell2);
            cell2.links.push(cell1);
        },
        metadata: config,
        randomCell(fnCriteria = () => true) {
            return random.choice(Object.values(cells).filter(fnCriteria));
        },
        addCell(...coords) {
            const cell = buildCell(...coords),
                id = cell.id;
            console.assert(!cells[id]);
            cells[id] = cell;
            return id;
        },
        removeCell(...coords) {
            const cell = this.getCellByCoordinates(coords);
            if (!cell) return;
            removeNeighbours(cell);
            delete cells[cell.id];
        },
        makeNeighbours(cell1WithDirection, cell2WithDirection) {
            const
                cell1 = cell1WithDirection.cell,
                cell1Direction = cell1WithDirection.direction,
                cell2 = cell2WithDirection.cell,
                cell2Direction = cell2WithDirection.direction;

            console.assert(cell1 !== cell2);
            console.assert(cell1Direction !== cell2Direction);
            console.assert(!cell1.neighbours[cell2Direction]);
            console.assert(!cell2.neighbours[cell1Direction]);
            cell1.neighbours[cell2Direction] = cell2;
            cell2.neighbours[cell1Direction] = cell1;
        },
        getCellByCoordinates(...coords) {
            const id = makeIdFromCoords(coords);
            return cells[id];
        },
        get cellCount() {
            return Object.values(cells).length;
        },
        on(eventName, handler) {
            eventTarget.on(eventName, handler);
        },
        findPathBetween(fromCoords, toCoords) {
            this.findDistancesFrom(...toCoords);
            let currentCell = this.getCellByCoordinates(...fromCoords),
                endCell = this.getCellByCoordinates(...toCoords);

            const path = [];

            path.push(currentCell.coords);
            while(currentCell !== endCell) {
                const currentDistance = currentCell.metadata[METADATA_DISTANCE],
                    nextCell = Object.values(currentCell.neighbours)
                        .filter(neighbour => currentCell.isLinkedTo(neighbour))
                        .find(neighbour => (neighbour.metadata || {})[METADATA_DISTANCE] === currentDistance - 1);
                if (!nextCell) break;
                path.push(nextCell.coords);
                currentCell = nextCell;
            }
            this.metadata[METADATA_PATH] = path;
            this.clearDistances();
        },
        findDistancesFrom(...coords) {
            this.clearDistances();
            const startCell = this.getCellByCoordinates(...coords);
            startCell.metadata[METADATA_DISTANCE] = 0;
            const priorityQueue = [startCell];
            let maxDistance = 0, maxDistancePoint;
            while(priorityQueue.length) {
                const next = priorityQueue.shift(),
                    priorityQueueDistance = next.metadata[METADATA_DISTANCE];
                const linkedUndistancedNeighbours = Object.values(next.neighbours)
                    .filter(neighbour => next.isLinkedTo(neighbour))
                    .filter(neighbour => neighbour.metadata[METADATA_DISTANCE] === undefined);

                linkedUndistancedNeighbours.forEach(neighbour => {
                    neighbour.metadata[METADATA_DISTANCE] = priorityQueueDistance + 1;
                });
                priorityQueue.push(...linkedUndistancedNeighbours);
                if (linkedUndistancedNeighbours.length) {
                    if (priorityQueueDistance >= maxDistance) {
                        maxDistancePoint = linkedUndistancedNeighbours[0];
                    }
                    maxDistance = Math.max(priorityQueueDistance+1, maxDistance);
                }
            }
            this.metadata[METADATA_MAX_DISTANCE] = maxDistance;
        },
        clearDistances() {
            this.clearMetadata(METADATA_DISTANCE);
        },
        clearPathAndSolution() {
            this.clearMetadata(METADATA_PATH, METADATA_PLAYER_CURRENT, METADATA_PLAYER_VISITED);
        },
        clearMetadata(...keys) {
            keys.forEach(key => {
                delete this.metadata[key];
                this.forEachCell(cell => delete cell.metadata[key]);
            });
        },
        dispose() {
            eventTarget.off();
            if (config.drawingSurface) {
                config.drawingSurface.dispose();
            }
        }
    };
}

function getDistanceColour(distance, maxDistance) {
    return `hsl(${Math.floor(100 - 100 * distance/maxDistance)}, 100%, 50%)`;
}

export function buildSquareGrid(config) {
    "use strict";
    const {drawingSurface: defaultDrawingSurface} = config,
        grid = buildBaseGrid(config);

    defaultDrawingSurface.on(EVENT_CLICK, event => {
        const coords = [Math.floor(event.x), Math.floor(event.y)];
        if (grid.getCellByCoordinates(coords)) {
            eventTarget.trigger(EVENT_CLICK, {
                coords,
                rawCoords: [event.rawX, event.rawY],
                shift: event.shift,
                alt: event.alt
            });
        }
    });

    grid.isSquare = true;
    grid.initialise = function() {
        for (let x=0; x < config.width; x++) {
            for (let y=0; y < config.height; y++) {
                grid.addCell(x, y);
            }
        }
        for (let x=0; x < config.width; x++) {
            for (let y=0; y < config.height; y++) {
                const cell = grid.getCellByCoordinates(x, y),
                    eastNeighbour = grid.getCellByCoordinates(x+1, y),
                    southNeighbour = grid.getCellByCoordinates(x, y+1);
                if (eastNeighbour) {
                    grid.makeNeighbours({cell, direction: DIRECTION_WEST}, {cell: eastNeighbour, direction: DIRECTION_EAST});
                }
                if (southNeighbour) {
                    grid.makeNeighbours({cell, direction: DIRECTION_NORTH}, {cell: southNeighbour, direction: DIRECTION_SOUTH});
                }
            }
        }
    };

    grid.render = function(drawingSurface = defaultDrawingSurface) {
        function drawFilledSquare(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y, cell) {
            drawingSurface.setColour(getCellBackgroundColour(cell, grid));
            drawingSurface.fillPolygon({x: p1x, y:p1y}, {x: p2x, y:p2y}, {x: p3x, y:p3y}, {x: p4x, y:p4y});
            drawingSurface.setColour(WALL_COLOUR);
        }

        drawingSurface.setSpaceRequirements(grid.metadata.width, grid.metadata.height);
        drawingSurface.clear();
        grid.forEachCell(cell => {
            const [x,y] = cell.coords;
            drawFilledSquare(x, y, x+1, y, x+1, y+1, x, y+1, cell);
        });

        grid.forEachCell(cell => {
            const [x,y] = cell.coords,
                northNeighbour = cell.neighbours[DIRECTION_NORTH],
                southNeighbour = cell.neighbours[DIRECTION_SOUTH],
                eastNeighbour = cell.neighbours[DIRECTION_EAST],
                westNeighbour = cell.neighbours[DIRECTION_WEST],
                exitDirection = cell.metadata[METADATA_START_CELL] || cell.metadata[METADATA_END_CELL];

            if ((!northNeighbour || !cell.isLinkedTo(northNeighbour)) && !(exitDirection === DIRECTION_NORTH)) {
                drawingSurface.line(x,y,x+1,y);
            }
            if ((!southNeighbour || !cell.isLinkedTo(southNeighbour)) && !(exitDirection === DIRECTION_SOUTH)) {
                drawingSurface.line(x,y+1,x+1,y+1);
            }
            if ((!eastNeighbour || !cell.isLinkedTo(eastNeighbour)) && !(exitDirection === DIRECTION_EAST)) {
                drawingSurface.line(x+1,y,x+1,y+1);
            }
            if ((!westNeighbour || !cell.isLinkedTo(westNeighbour)) && !(exitDirection === DIRECTION_WEST)) {
                drawingSurface.line(x,y,x,y+1);
            }
            cell.metadata[METADATA_RAW_COORDS] = drawingSurface.convertCoords(x + 0.5, y + 0.5);
        });

        const path = grid.metadata[METADATA_PATH];
        if (path) {
            const LINE_OFFSET = 0.5,
                exitDetails = findExitCells(grid);

            if (exitDetails) {
                const [startCell, startDirection] = exitDetails[METADATA_START_CELL],
                    {x: startXOffset, y: startYOffset} = exitDirectionOffsets[startDirection],
                    [endCell, endDirection] = exitDetails[METADATA_END_CELL],
                    {x: endXOffset, y: endYOffset} = exitDirectionOffsets[endDirection];
                path.unshift([path[0][0] + startXOffset, path[0][1] + startYOffset]);
                path.push([path[path.length - 1][0] + endXOffset, path[path.length - 1][1] + endYOffset]);
            }

            let previousCoords;
            drawingSurface.setColour(PATH_COLOUR);
            path.forEach((currentCoords, i) => {
                if (i) {
                    const x1 = previousCoords[0] + LINE_OFFSET,
                        y1 = previousCoords[1] + LINE_OFFSET,
                        x2 = currentCoords[0] + LINE_OFFSET,
                        y2 = currentCoords[1] + LINE_OFFSET;
                    drawingSurface.line(x1, y1, x2, y2);
                }
                previousCoords = currentCoords;
            });

            drawingSurface.setColour(WALL_COLOUR);
        }
    };

    function findHardestExits() {
        let edgeCells = [];

        grid.forEachCell(cell => {
            const [x,y] = cell.coords;

            if (cell.neighbours.toArray().length !== 4) {
                edgeCells.push(cell);
            }
        });

        function findRandomMissingNeighbourDirection(cell) {
            const missingNeighbourDirections = [DIRECTION_NORTH, DIRECTION_SOUTH, DIRECTION_EAST, DIRECTION_WEST].filter(direction => !cell.neighbours[direction]);
            return config.random.choice(missingNeighbourDirections);
        }

        function findFurthestEdgeCellFrom(startCell) {
            let maxDistance = 0, furthestEdgeCell;

            grid.findDistancesFrom(startCell.coords);

            edgeCells.forEach(edgeCell => {
                const distance = edgeCell.metadata[METADATA_DISTANCE];
                if (distance > maxDistance) {
                    maxDistance = distance;
                    furthestEdgeCell = edgeCell;
                }
            });
            grid.clearDistances();

            return furthestEdgeCell;
        }

        const tmpStartCell = config.random.choice(edgeCells),
            endCell = findFurthestEdgeCellFrom(tmpStartCell),
            startCell = findFurthestEdgeCellFrom(endCell);

        startCell.metadata[METADATA_START_CELL] = findRandomMissingNeighbourDirection(startCell);
        endCell.metadata[METADATA_END_CELL] = findRandomMissingNeighbourDirection(endCell);
    }

    function findVerticalExits() {
        const centerX = Math.round(grid.metadata.width / 2) - 1;
        let minY = Number.MAX_VALUE, maxY = Number.MIN_VALUE;
        grid.forEachCell(cell => {
            const [x,y] = cell.coords;
            if (x === centerX) {
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        });
        grid.getCellByCoordinates(centerX, maxY).metadata[METADATA_START_CELL] = DIRECTION_SOUTH;
        grid.getCellByCoordinates(centerX, minY).metadata[METADATA_END_CELL] = DIRECTION_NORTH;
    }

    function findHorizontalExits() {
        const centerY = Math.round(grid.metadata.height / 2) - 1;
        let minX = Number.MAX_VALUE, maxX = Number.MIN_VALUE;
        grid.forEachCell(cell => {
            const [x,y] = cell.coords;
            if (y === centerY) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
            }
        });
        grid.getCellByCoordinates(minX, centerY).metadata[METADATA_START_CELL] = DIRECTION_WEST;
        grid.getCellByCoordinates(maxX, centerY).metadata[METADATA_END_CELL] = DIRECTION_EAST;
    }

    grid.placeExits = function() {
        const exitConfig = config.exitConfig;

        if (exitConfig === EXITS_HARDEST) {
            findHardestExits();

        } else if (exitConfig === EXITS_VERTICAL) {
            findVerticalExits();

        } else if (exitConfig === EXITS_HORIZONTAL) {
            findHorizontalExits();
        }
    };

    grid.getClosestDirectionForClick = function(cell, clickEvent) {
        const [cellX, cellY] = cell.metadata[METADATA_RAW_COORDS],
            [clickX, clickY] = clickEvent.rawCoords,
            xDiff = clickX - cellX,
            yDiff = clickY - cellY;

        if (Math.abs(xDiff) < Math.abs(yDiff)) {
            return yDiff > 0 ? DIRECTION_SOUTH : DIRECTION_NORTH;
        } else {
            return xDiff > 0 ? DIRECTION_EAST : DIRECTION_WEST;
        }
    };

    return grid;
}
