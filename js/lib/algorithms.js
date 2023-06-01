import {forEachContiguousPair} from './utils.js';
import {
    ALGORITHM_NONE,
    ALGORITHM_BINARY_TREE,
    ALGORITHM_SIDEWINDER,
    ALGORITHM_ALDOUS_BRODER,
    ALGORITHM_WILSON,
    ALGORITHM_HUNT_AND_KILL,
    ALGORITHM_RECURSIVE_BACKTRACK,
    ALGORITHM_KRUSKAL,
    ALGORITHM_SIMPLIFIED_PRIMS,
    ALGORITHM_TRUE_PRIMS,
    ALGORITHM_ELLERS,
    METADATA_VISITED,
    METADATA_SET_ID,
    METADATA_CURRENT_CELL,
    METADATA_UNPROCESSED_CELL,
    METADATA_COST,
    DIRECTION_EAST,
    DIRECTION_SOUTH,
    ALGORITHM_SMALL_ROOMS,
    DIRECTION_WEST,
    DIRECTION_NORTH,
    ALGORITHM_SERPENTINE,
    ALGORITHM_SPIRAL,
    ALGORITHM_GROWING_TREE, ALGORITHM_RECURSIVE_DIVISION,
} from './constants.js';

function markAsVisited(cell) {
    cell.metadata[METADATA_VISITED] = true;
}

function isVisited(cell) {
    return cell.metadata[METADATA_VISITED];
}

function isUnvisited(cell) {
    return !isVisited(cell);
}

function algorithmProgress(grid) {
    let previousCells;

    grid.forEachCell(cell => cell.metadata[METADATA_UNPROCESSED_CELL] = true);

    return {
        step(...cells) {
            this.current(...cells);
            cells.forEach(cell => delete cell.metadata[METADATA_UNPROCESSED_CELL]);
        },
        current(...cells) {
            (previousCells || []).forEach(previousCell => delete previousCell.metadata[METADATA_CURRENT_CELL]);
            cells.forEach(cell => cell.metadata[METADATA_CURRENT_CELL] = true);
            previousCells = cells;
        },
        finished() {
            (previousCells || []).forEach(previousCell => delete previousCell.metadata[METADATA_CURRENT_CELL]);
        }
    };
}

export const algorithms = {
    [ALGORITHM_NONE]: {
        metadata: {
            'description': 'Сетка',

        },
        fn: function*(grid, config) {}
    },
    [ALGORITHM_BINARY_TREE]: {
        metadata: {
            'description': 'Двоичное дерево',

        },
        fn: function*(grid, config) {
            "use strict";
            const {random} = config,
                allCoords = grid.getAllCellCoords(),
                progress = algorithmProgress(grid);

            for (let i = 0; i < allCoords.length; i++) {
                const
                    cell = grid.getCellByCoordinates(allCoords[i]),
                    eastNeighbour = cell.neighbours[DIRECTION_EAST],
                    southNeighbour = cell.neighbours[DIRECTION_SOUTH],
                    goEast = random.int(2) === 0,
                    goSouth = !goEast,
                    linkEast = eastNeighbour && (goEast || !southNeighbour),
                    linkSouth = southNeighbour && (goSouth || !eastNeighbour);

                if (linkEast) {
                    grid.link(cell, eastNeighbour);

                } else if (linkSouth) {
                    grid.link(cell, southNeighbour);
                }
                progress.step(cell);
                yield;
            }
            progress.finished();
        }
    },
    [ALGORITHM_SMALL_ROOMS]: {
        metadata: {
            description: 'Маленькие комнаты',
            type: 'other',
        },
        fn: function*(grid, config) {
            "use strict";
            const {random} = config,
              height = grid.metadata.height,
              width = grid.metadata.width,
              progress = algorithmProgress(grid);

            for (let y = 1; y < height - 1; y++) {
                if (y % 2) {
                    for (let x = 1; x < width - 3; x += 4) {
                        const limit = !random.range(3) ? 3 : 2;
                        for (let idx = 0; idx < limit; idx++) {
                            const cell = grid.getCellByCoordinates(x + idx, y);
                            if (!cell) {
                                break;
                            }
                            grid.removeCell(x + idx, y);
                            progress.step(cell);
                            yield;
                        }
                    }
                } else {
                    for (let x = 2; x < width - 1; x += 4) {
                        const cell = grid.getCellByCoordinates(x, y);
                        if (!cell) {
                            break;
                        }
                        grid.removeCell(x, y);
                        progress.step(cell);
                        yield;
                    }
                }
            }
            const y_mid = Math.floor(height / 2);
        }
    },
    [ALGORITHM_SIDEWINDER]: {
        metadata: {
            'description': 'Sidewinder',

        },
        fn: function*(grid, config) {
            "use strict";
            const {random} = config,
                progress = algorithmProgress(grid);

            for (let y = 0; y < grid.metadata.height; y++) {
                let currentRun = [];
                for (let x = 0; x < grid.metadata.width; x++) {
                    const cell = grid.getCellByCoordinates(x, y),
                        eastNeighbour = cell.neighbours[DIRECTION_EAST],
                        southNeighbour = cell.neighbours[DIRECTION_SOUTH],
                        goEast = eastNeighbour && (random.int(2) === 0 || !southNeighbour);

                    currentRun.push(cell);
                    if (goEast) {
                        grid.link(cell, eastNeighbour);

                    } else if (southNeighbour) {
                        const randomCellFromRun = random.choice(currentRun),
                            southNeighbourOfRandomCell = randomCellFromRun.neighbours[DIRECTION_SOUTH];

                        grid.link(randomCellFromRun, southNeighbourOfRandomCell);

                        currentRun = [];
                    }

                    progress.step(cell);
                    yield;
                }
            }
            progress.finished();
        }
    },
    [ALGORITHM_ALDOUS_BRODER]: {
        metadata: {
            'description': 'Алгоритм Олдоса – Бродера',

        },
        fn: function*(grid, config) {
            "use strict";
            const progress = algorithmProgress(grid);
            let unvisitedCount = grid.cellCount, currentCell;

            function moveTo(nextCell) {
                if (isUnvisited(nextCell)) {
                    unvisitedCount--;
                    markAsVisited(nextCell);
                    if (currentCell) {
                        grid.link(currentCell, nextCell);
                    }
                }
                progress.step(currentCell = nextCell);
            }

            const startCell = grid.randomCell();
            moveTo(startCell);

            while (unvisitedCount) {
                const nextCell = currentCell.neighbours.random();
                yield;

                moveTo(nextCell);
            }
            progress.finished();
        }
    },
    [ALGORITHM_WILSON]: {
        metadata: {
            'description': 'Алгоритм Уилсона',

        },
        fn: function*(grid, config) {
            "use strict";
            const progress = algorithmProgress(grid);

            function markVisited(cell) {
                progress.step(cell);
                cell.metadata[METADATA_VISITED] = true;
            }
            function removeLoops(cells) {
                const latestCell = cells[cells.length - 1],
                    indexOfPreviousVisit = cells.findIndex(cell => cell === latestCell);
                if (indexOfPreviousVisit >= 0) {
                    cells.splice(indexOfPreviousVisit + 1);
                }
            }

            markVisited(grid.randomCell(isUnvisited));

            let currentCell;
            while (currentCell = grid.randomCell(isUnvisited)) {
                let currentPath = [currentCell];

                while (true) {
                    const nextCell = currentCell.neighbours.random();
                    currentPath.push(nextCell);
                    progress.current(nextCell);

                    if (isUnvisited(nextCell)) {
                        removeLoops(currentPath);
                        currentCell = nextCell;
                    } else {
                        forEachContiguousPair(currentPath, grid.link);
                        currentPath.forEach(markVisited);
                        break;
                    }
                    yield;
                }
            }
            progress.finished();
        }
    },
    [ALGORITHM_HUNT_AND_KILL]: {
        metadata: {
            'description': 'Hunt and Kill',

        },
        fn: function*(grid, config) {
            "use strict";
            const progress = algorithmProgress(grid);

            let currentCell = grid.randomCell();

            progress.step(currentCell);
            markAsVisited(currentCell);

            while (true) {
                const nextCell = currentCell.neighbours.random(isUnvisited);
                if (nextCell) {
                    markAsVisited(nextCell);
                    grid.link(currentCell, nextCell);
                    currentCell = nextCell;
                } else {
                    const unvisitedCellWithVisitedNeighbours = grid.randomCell(cell => isUnvisited(cell) && cell.neighbours.random(isVisited));
                    if (unvisitedCellWithVisitedNeighbours) {
                        const visitedNeighbour = unvisitedCellWithVisitedNeighbours.neighbours.random(isVisited);
                        markAsVisited(unvisitedCellWithVisitedNeighbours);
                        grid.link(unvisitedCellWithVisitedNeighbours, visitedNeighbour);
                        currentCell = unvisitedCellWithVisitedNeighbours;
                    } else {
                        break;
                    }
                }
                progress.step(currentCell);
                yield;
            }
            progress.finished();
        }
    },
    [ALGORITHM_RECURSIVE_BACKTRACK]: {
        metadata: {
            'description': 'Recursive Backtrack',

        },
        fn: function*(grid) {
            "use strict";
            const stack = [], progress = algorithmProgress(grid);
            let currentCell;

            function visitCell(nextCell) {
                const previousCell = currentCell;
                currentCell = nextCell;
                markAsVisited(currentCell);
                if (previousCell) {
                    grid.link(currentCell, previousCell);
                }
                stack.push(currentCell);
            }

            const startCell = grid.randomCell();
            visitCell(startCell);
            progress.step(startCell);

            while (stack.length) {
                const nextCell = currentCell.neighbours.random(isUnvisited);
                if (nextCell) {
                    visitCell(nextCell);

                } else {
                    while (!currentCell.neighbours.random(isUnvisited)) {
                        stack.pop();
                        if (!stack.length) {
                            break;
                        }
                        currentCell = stack[stack.length - 1];
                    }
                }
                progress.step(currentCell);
                yield;
            }
            progress.finished();
        }
    },
    [ALGORITHM_KRUSKAL]: {
        metadata: {
            'description': 'Алгоритм Краскала',
        },
        fn: function*(grid, config) {
            "use strict";
            const {random} = config,
                links = [],
                connectedSets = {},
                progress = algorithmProgress(grid);

            grid.forEachCell(cell => {
                const
                    eastNeighbour = cell.neighbours[DIRECTION_EAST],
                    southNeighbour = cell.neighbours[DIRECTION_SOUTH];

                if (eastNeighbour) {
                    links.push([cell, eastNeighbour]);
                }
                if (southNeighbour) {
                    links.push([cell, southNeighbour]);
                }
                cell.metadata[METADATA_SET_ID] = cell.id;
                connectedSets[cell.id] = [cell];
            });

            random.shuffle(links);

            function mergeSets(id1, id2) {
                connectedSets[id2].forEach(cell => {
                    cell.metadata[METADATA_SET_ID] = id1;
                    connectedSets[id1].push(cell);
                });
                delete connectedSets[id2];
            }

            while (links.length) {
                const [cell1, cell2] = links.pop(),
                    id1 = cell1.metadata[METADATA_SET_ID],
                    id2 = cell2.metadata[METADATA_SET_ID];
                if (id1 !== id2) {
                    grid.link(cell1, cell2);
                    mergeSets(id1, id2);
                    progress.step(cell1, cell2);
                    yield;

                }
            }
            progress.finished();
        }
    },
    [ALGORITHM_SIMPLIFIED_PRIMS]: {
        metadata: {
            'description': 'Алгоритм Прима (упрощённый)',

        },
        fn: function*(grid, config) {
            function addToActive(cell) {
                active.push(cell);
                cell.metadata[METADATA_VISITED] = true;
                progress.step(cell);
            }
            const {random} = config,
                progress = algorithmProgress(grid),
                active = [];

            addToActive(grid.randomCell());

            while (active.length) {
                const randomActiveCell = random.choice(active),
                    randomInactiveNeighbour = randomActiveCell.neighbours.random(isUnvisited);
                if (!randomInactiveNeighbour) {
                    const indexOfRandomActiveCell = active.indexOf(randomActiveCell);
                    console.assert(indexOfRandomActiveCell > -1);
                    active.splice(indexOfRandomActiveCell, 1);
                } else {
                    grid.link(randomActiveCell, randomInactiveNeighbour);
                    addToActive(randomInactiveNeighbour);
                    yield;
                }
            }
            progress.finished();

        }
    },

    [ALGORITHM_TRUE_PRIMS]: {
        metadata: {
            'description': 'Алгоритм Прима (модифицированный)',

        },
        fn: function*(grid, config) {
            function addToActive(cell) {
                active.push(cell);
                cell.metadata[METADATA_VISITED] = true;
                progress.step(cell);
            }

            function getCellWithLowestCost(cells) {
                return cells.sort((n1, n2) => n1.metadata[METADATA_COST] - n2.metadata[METADATA_COST])[0]
            }

            const {random} = config,
                progress = algorithmProgress(grid),
                active = [];

            grid.forEachCell(cell => {
                cell.metadata[METADATA_COST] = random.int(grid.cellCount);
            });

            addToActive(grid.randomCell());

            while (active.length) {
                const randomActiveCell = getCellWithLowestCost(active),
                    inactiveNeighbours = randomActiveCell.neighbours.toArray().filter(isUnvisited);
                if (!inactiveNeighbours.length) {
                    const indexOfRandomActiveCell = active.indexOf(randomActiveCell);
                    console.assert(indexOfRandomActiveCell > -1);
                    active.splice(indexOfRandomActiveCell, 1);
                } else {
                    const inactiveNeighbourWithLowestCost = getCellWithLowestCost(inactiveNeighbours);
                    grid.link(randomActiveCell, inactiveNeighbourWithLowestCost);
                    addToActive(inactiveNeighbourWithLowestCost);
                    yield;
                }
            }

            progress.finished();
        }
    },
    [ALGORITHM_GROWING_TREE]: {
        metadata: {
            description: 'Алгоритм растущего дерева',
        },
        fn: function*(grid, config) {
            function addToActive(cell) {
                active.push(cell);
                cell.metadata[METADATA_VISITED] = true;
                progress.step(cell);
            }

            function getCellWithLowestCost(cells) {
                return cells.sort((n1, n2) => n1.metadata[METADATA_COST] - n2.metadata[METADATA_COST])[0]
            }

            const {random} = config,
                progress = algorithmProgress(grid),
                active = [];

            grid.forEachCell(cell => {
                cell.metadata[METADATA_COST] = random.int(grid.cellCount);
            });

            addToActive(grid.randomCell());

            while (active.length) {
                const criteria = ['byRandom', 'byCost'];
                switch(criteria[random.range(0, 1)]) {
                    case 'byRandom': {
                        const randomActiveCell = random.choice(active),
                          randomInactiveNeighbour = randomActiveCell.neighbours.random(isUnvisited);
                        if (!randomInactiveNeighbour) {
                            const indexOfRandomActiveCell = active.indexOf(randomActiveCell);
                            console.assert(indexOfRandomActiveCell > -1);
                            active.splice(indexOfRandomActiveCell, 1);
                        } else {
                            grid.link(randomActiveCell, randomInactiveNeighbour);
                            addToActive(randomInactiveNeighbour);
                            yield;
                        }
                    }
                    case 'byCost': {
                        const randomActiveCell = getCellWithLowestCost(active),
                            inactiveNeighbours = randomActiveCell?.neighbours.toArray().filter(isUnvisited);
                        if (!inactiveNeighbours?.length) {
                            const indexOfRandomActiveCell = active.indexOf(randomActiveCell);
                            console.assert(indexOfRandomActiveCell > -1);
                            active.splice(indexOfRandomActiveCell, 1);
                        } else {
                            const inactiveNeighbourWithLowestCost = getCellWithLowestCost(inactiveNeighbours);
                            grid.link(randomActiveCell, inactiveNeighbourWithLowestCost);
                            addToActive(inactiveNeighbourWithLowestCost);
                            yield;
                        }
                    }
                }
            }

            progress.finished();
        }
    },
    [ALGORITHM_RECURSIVE_DIVISION]: {
        metadata: {
            description: 'Алгоритм рекурсивного деления'
        },
        fn: function*(grid, config) {
            const {random} = config,
              height = grid.metadata.height,
              width = grid.metadata.width,
              progress = algorithmProgress(grid);

            const unlink = (cell, neighbour) => {
                cell.links = cell.neighbours.toArray().filter((item) => item !== neighbour);
            }

            const divideByX = (row, column, height, width) => {
                const divideSouthOf = random.int(height - 1);
                const passageAt = random.int(width);
                for (let x = 0; x < width; x++) {
                    if (passageAt === x) continue;
                    const cell = grid.getCellByCoordinates(row + divideSouthOf, column + x);
                    if (cell) {
                        const southNeighbour = cell.neighbours[DIRECTION_SOUTH];
                        if (southNeighbour) {
                            unlink(cell, southNeighbour);
                            unlink(southNeighbour, cell);
                        }
                    }

                }

                divide(row, column, divideSouthOf + 1, width);
                divide(row + divideSouthOf + 1, column, height - divideSouthOf - 1, width);
            }

            const divideByY = (row, column, height, width) => {
                const divideEastOf = random.int(width - 1);
                const passageAt = random.int(height);

                for (let y = 0; y < height; y++) {
                    if (passageAt === y) continue;
                    const cell = grid.getCellByCoordinates(row + y, column + divideEastOf);
                    if (cell) {
                        const eastNeighbour = cell.neighbours[DIRECTION_EAST];
                        if (eastNeighbour) {
                            unlink(cell, eastNeighbour);
                            unlink(eastNeighbour, cell);
                        }
                    }
                }

                divide(row, column, height, divideEastOf + 1);
                divide(row, column + divideEastOf + 1, height, width - divideEastOf - 1);
            }

            const divide = (row, column, height, width) => {
                if (height <= 1 || width <= 1) return;
                if (height > width) {
                    divideByX(row, column, height, width);
                } else {
                    divideByY(row, column, height, width);
                }
            };

            grid.forEachCell((cell) => {
                cell.neighbours.toArray().forEach((neighbour) => {
                    grid.link(cell, neighbour);
                });
                progress.step(cell);
            });
            divide(0, 0, height, width);
            progress.finished(true);
        }
    },
    [ALGORITHM_SERPENTINE]: {
      metadata: {
        description: 'Змеевидный лабиринт',
        type: 'other',
      },
      fn: function* (grid, config) {
        const {random} = config,
          height = grid.metadata.height,
          width = grid.metadata.width,
          progress = algorithmProgress(grid);

        grid.forEachCell((cell) => {
          cell.neighbours.toArray().forEach((neighbour) => {
              grid.link(cell, neighbour);
          });
        });

        for (let y = 1; y < height - 1; y++) {
          let coords = [random.range(1, width - 1), y];
          let cell = grid.getCellByCoordinates(...coords);
          if (!cell) {
            break;
          }
          progress.step(cell);
          yield;

          for (let x = 1; x < width - 1; x += 2) {
            let cell = grid.getCellByCoordinates(x, y);
            if (!cell) {
              break;
            }
            progress.step(cell);
            yield;
          }
        }

        for (let x = 2; x < width - 1; x += 4) {
          let cell = grid.getCellByCoordinates(x, 1);
          if (!cell) {
            break;
          }
          progress.step(cell);
          yield;
        }

        for (let x = 4; x < width - 1; x += 4) {
          let cell = grid.getCellByCoordinates(x, height - 2);
          if (!cell) {
            break;
          }
          progress.step(cell);
          yield;
        }
      }
    },
    [ALGORITHM_SPIRAL]: {
        metadata: {
            description: 'Спиральный лабиринт',
            type: 'other',
        },
        fn: function*(grid, config) {
            const {random} = config,
              height = grid.metadata.height,
              width = grid.metadata.width,
              progress = algorithmProgress(grid);

           let limitNorth = 1,
               limitEast = width - 2,
               limitSouth = height - 2,
               limitWest = 1;

           const processCell = (x, y, direction) => {
               const cell = grid.getCellByCoordinates(x, y),
                   neighbour = cell?.neighbours[direction];

               if (!cell || !neighbour) return;

               grid.link(cell, cell.neighbours[direction]);
               progress.step(cell);
           }

           let direction = DIRECTION_EAST;
           let x = 1, y = 1;
           while (true) {
               const currentX = x, currentY = y;
               switch (direction) {
                   case DIRECTION_EAST: {
                       for (x; x < limitEast; x++) {
                           processCell(x, y, direction);
                           yield;
                       }
                       direction = DIRECTION_SOUTH;
                       limitEast -= 2;
                       break;
                   }
                   case DIRECTION_SOUTH: {
                       for (y; y < limitSouth; y++) {
                           processCell(x, y, direction);
                           yield;
                       }
                       direction = DIRECTION_WEST;
                       limitSouth -= 2;
                       break;
                   }
                   case DIRECTION_WEST: {
                       for (x; x > limitWest; x--) {
                           processCell(x, y, direction);
                           yield;
                       }
                       direction = DIRECTION_NORTH;
                       limitWest += 2;
                       break;
                   }
                   case DIRECTION_NORTH: {
                       for (y; y > limitNorth; y--) {
                           processCell(x, y, direction);
                           yield;
                       }
                       direction = DIRECTION_EAST;
                       limitNorth += 2;
                       break;
                   }
               }
               if (currentX === x && currentY === y) {
                   processCell(x, y, direction);
                   break;
               }
           }
            progress.finished(true);
        }
    },
   [ALGORITHM_ELLERS]: {
        metadata: {
            'description': 'Алгоритм Эллера',
        },
        fn: function*(grid, config) {
            "use strict";
            const ODDS_OF_MERGE = 2,
                ODDS_OF_LINK_BELOW = 5,
                sets = {},
                {random} = config,
                {width, height} = grid.metadata;
            let nextSetId = 1;

            function addCellToSet(setId, cell) {
                cell.metadata[METADATA_SET_ID] = setId;
                if (!sets[setId]) {
                    sets[setId] = [];
                }
                sets[setId].push(cell);
            }

            function mergeSets(setId1, setId2) {
                const set1 = sets[setId1],
                    set2 = sets[setId2];
                console.assert(set1.length && set2.length);
                set2.forEach(cell => addCellToSet(setId1, cell));
                delete sets[setId2];
            }

            function linkToCellBelow(cell) {
                const [x,y] = cell.coords,
                    cellBelow = grid.getCellByCoordinates(x, y+1);
                grid.link(cell, cellBelow);
                addCellToSet(cell.metadata[METADATA_SET_ID], cellBelow);
            }

            function mergeCellsInRow(y, oddsOfMerge=1) {
                for(let i=0; i<width-1; i++) {
                    const cell1 = grid.getCellByCoordinates(i, y),
                        cell2 = grid.getCellByCoordinates(i+1, y),
                        cell1SetId = cell1.metadata[METADATA_SET_ID],
                        cell2SetId = cell2.metadata[METADATA_SET_ID];

                    if (cell1SetId !== cell2SetId && random.int(oddsOfMerge) === 0) {
                        grid.link(cell1, cell2);
                        mergeSets(cell1.metadata[METADATA_SET_ID], cell2.metadata[METADATA_SET_ID]);
                    }
                }
            }

            for (let y = 0; y < height; y++) {
                const row = [];
                for (let x = 0; x < width; x++) {
                    const cell = grid.getCellByCoordinates(x, y);
                    if (!cell.metadata[METADATA_SET_ID]) {
                        addCellToSet(nextSetId++, cell);
                    }
                    row.push(cell);
                }

                const isLastRow = y === height - 1;
                if (isLastRow) {
                    mergeCellsInRow(y);

                } else {
                    mergeCellsInRow(y, ODDS_OF_MERGE);

                    const cellsInRowBySet = {};
                    row.forEach(cell => {
                        const setId = cell.metadata[METADATA_SET_ID];
                        if (!cellsInRowBySet[setId]) {
                            cellsInRowBySet[setId] = [];
                        }
                        cellsInRowBySet[setId].push(cell);
                    });

                    Object.keys(cellsInRowBySet).forEach(setId => {
                        random.shuffle(cellsInRowBySet[setId]).forEach((cell, i) => {
                            if (i === 0) {
                                linkToCellBelow(cell);
                            } else if (random.int(ODDS_OF_LINK_BELOW) === 0) {
                                linkToCellBelow(cell);
                            }
                        });
                    });
                }

            }
            grid.clearMetadata(METADATA_SET_ID);
            return grid;
        }
    }
};



