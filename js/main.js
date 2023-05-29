import {buildModel} from './model.js';
import {
    buildView,
    EVENT_KEY_PRESS,
    EVENT_PLAY_BUTTON_CLICKED,
    EVENT_SOLVE_BUTTON_CLICKED,
    EVENT_STOP_BUTTON_CLICKED
} from './view.js';
import {buildMaze} from './lib/main.js';
import {
    buildStateMachine,
    STATE_INIT,
    STATE_DISPLAYING,
    STATE_RUNNING_ALGORITHM,
    STATE_PLAYING
} from './stateMachine.js';
import {drawingSurfaces} from './lib/drawingSurfaces.js';
import {
    EVENT_SIZE_PARAMETER_CHANGED, EVENT_ALGORITHM_SELECTED, EVENT_GO_BUTTON_CLICKED, EVENT_FINISH_RUNNING_BUTTON_CLICKED, EVENT_DELAY_SELECTED,
    EVENT_CHANGE_PARAMS_BUTTON_CLICKED, EVENT_EXITS_SELECTED,
} from './view.js';
import {config} from './config.js';
import {algorithms} from './lib/algorithms.js';
import {buildRandom} from './lib/random.js';
import {
    ALGORITHM_NONE,
    METADATA_MASKED,
    METADATA_END_CELL,
    METADATA_START_CELL,
    EVENT_CLICK,
    EXITS_NONE,
    EXITS_HARDEST,
    EXITS_HORIZONTAL,
    EXITS_VERTICAL,
    DIRECTION_NORTH_WEST,
    DIRECTION_NORTH_EAST,
    DIRECTION_SOUTH_WEST,
    DIRECTION_SOUTH_EAST,
    DIRECTION_CLOCKWISE,
    DIRECTION_ANTICLOCKWISE,
    DIRECTION_OUTWARDS,
    DIRECTION_INWARDS,
    DIRECTION_SOUTH,
    DIRECTION_EAST,
    DIRECTION_WEST,
    DIRECTION_NORTH, METADATA_PLAYER_CURRENT, METADATA_PATH, SHAPE_SQUARE, METADATA_PLAYER_VISITED,
} from './lib/constants.js';

window.onload = () => {
    "use strict";
    const model = buildModel(),
      stateMachine = buildStateMachine(),
      view = buildView(model, stateMachine);

    function setupSizeParameters() {
        const shape = model.shape,
          parameters = config.shapes[shape].parameters;

        model.size = {};
        view.clearSizeParameters();

        Object.entries(parameters).forEach(([paramName, paramValues]) => {
            view.addSizeParameter(paramName, paramValues.min, paramValues.max);
        });

        function onParameterChanged(name, value) {
            model.size[name] = value;
            view.setSizeParameter(name, value);
        }

        Object.entries(parameters).forEach(([paramName, paramValues]) => {
            onParameterChanged(paramName, paramValues.initial);
        });

        view.on(EVENT_SIZE_PARAMETER_CHANGED, data => {
            if (view.getValidSizeParameters().includes(data.name)) {
                onParameterChanged(data.name, data.value);
                showEmptyGrid(true);
                setupAlgorithms();
            }
        });
    }

    function setupAlgorithms() {
        const shape = model.shape;

        view.clearAlgorithms();

        Object.entries(algorithms).filter(([algorithmId, algorithm]) => algorithmId !== ALGORITHM_NONE).forEach(([algorithmId, algorithm]) => {
            view.addAlgorithm(algorithm.metadata.description, algorithm.metadata.type, algorithmId);
        });

        function onAlgorithmChanged(data) {
            view.setAlgorithm(model.algorithm = data.algorithmId, data.type);
        }

        onAlgorithmChanged(config.shapes[shape].defaultAlgorithm);

        view.on(EVENT_ALGORITHM_SELECTED, onAlgorithmChanged);
    }

    function setupAlgorithmDelay() {
        view.addAlgorithmDelay('Мгновенная генерация лабиринта', 0);
        view.addAlgorithmDelay('Пошаговая генерация лабиринта', 15000);

        view.on(EVENT_DELAY_SELECTED, algorithmDelay => {
            model.algorithmDelay = algorithmDelay;
            view.setAlgorithmDelay(algorithmDelay);
        });
        view.setAlgorithmDelay(model.algorithmDelay);
    }

    function setupExitConfigs() {
        view.addExitConfiguration('Без выхода', EXITS_NONE);
        view.addExitConfiguration('Снизу вверх', EXITS_VERTICAL);
        view.addExitConfiguration('Слева направо', EXITS_HORIZONTAL);
        view.addExitConfiguration('Самый сложный вход/выход', EXITS_HARDEST);

        view.on(EVENT_EXITS_SELECTED, exitConfig => {
            view.setExitConfiguration(model.exitConfig = exitConfig);
        });
        view.setExitConfiguration(model.exitConfig);
    }

    setupSizeParameters();
    setupExitConfigs();
    setupAlgorithmDelay();
    setupAlgorithms();
    showEmptyGrid(true);

    function buildMazeUsingModel(overrides = {}) {
        if (model.maze) {
            model.maze.dispose();
        }

        const grid = Object.assign({'cellShape': model.shape}, model.size),
          maze = buildMaze({
              grid,
              'algorithm': overrides.algorithm || model.algorithm,
              'randomSeed': model.randomSeed,
              'element': overrides.element || document.getElementById('maze'),
              'exitConfig': overrides.exitConfig || model.exitConfig
          });

        model.maze = maze;

        const algorithmDelay = overrides.algorithmDelay !== undefined ? overrides.algorithmDelay : model.algorithmDelay,
          runAlgorithm = maze.runAlgorithm;
        if (algorithmDelay) {
            model.runningAlgorithm = {run: runAlgorithm};
            return new Promise(resolve => {
                stateMachine.runningAlgorithm();
                model.runningAlgorithm.interval = setInterval(() => {
                    const done = runAlgorithm.oneStep();
                    maze.render();
                    if (done) {
                        clearInterval(model.runningAlgorithm.interval);
                        delete model.runningAlgorithm;
                        stateMachine.displaying();
                        resolve();
                    }
                }, algorithmDelay / maze.cellCount);
            });

        } else {
            runAlgorithm.toCompletion();
            maze.render();
            return Promise.resolve();
        }

    }

    function showEmptyGrid(deleteMaskedCells) {
        buildMazeUsingModel({
            algorithmDelay: 0,
            exitConfig: EXITS_NONE,
            algorithm: ALGORITHM_NONE,
        })
          .then(() => model.maze.render());
    }

    function ifStateIs(...states) {
        return {
            then(handler) {
                return event => {
                    if (states.includes(stateMachine.state)) {
                        handler(event);
                    }
                };
            }
        }
    }

    view.on(EVENT_GO_BUTTON_CLICKED, () => {
        model.randomSeed = Number(view.getSeed() || buildRandom().int(Math.pow(10, 9)));
        view.showSeedValue();

        const errors = view.inputErrorMessage();
        if (errors) {
            alert(errors);
        } else {
            buildMazeUsingModel().then(() => {
                view.toggleSolveButtonCaption(true);
                model.maze.render();
                stateMachine.displaying();
            });
        }
    });

    view.on(EVENT_FINISH_RUNNING_BUTTON_CLICKED, () => {
        clearInterval(model.runningAlgorithm.interval);
        model.runningAlgorithm.run.toCompletion();
        delete model.runningAlgorithm;
        stateMachine.displaying();
        model.maze.render();
    });

    stateMachine.onStateChange(newState => {
        view.updateForNewState(newState);
    });
    view.updateForNewState(stateMachine.state);

    view.on(EVENT_CHANGE_PARAMS_BUTTON_CLICKED, () => {
        showEmptyGrid(true);
        stateMachine.init();
    });

    view.on(EVENT_CHANGE_PARAMS_BUTTON_CLICKED, () => {
        showEmptyGrid(true);
        stateMachine.init();
    });

    function findStartAndEndCells() {
        let startCell, endCell;
        model.maze.forEachCell(cell => {
            if (cell.metadata[METADATA_START_CELL]) {
                startCell = cell;
            }
            if (cell.metadata[METADATA_END_CELL]) {
                endCell = cell;
            }
        });
        return [startCell, endCell];
    }
    view.on(EVENT_SOLVE_BUTTON_CLICKED, () => {
        const [startCell, endCell] = findStartAndEndCells();
        if (!(startCell && endCell)) {
            alert('Для того, чтобы решить лабиринт, сначала следует сгенерировать его');
            return;
        }
        if (model.maze.metadata[METADATA_PATH]) {
            model.maze.clearPathAndSolution();
            view.toggleSolveButtonCaption(true);
        } else {
            const [startCell, endCell] = findStartAndEndCells();
            console.assert(startCell);
            console.assert(endCell);
            model.maze.findPathBetween(startCell.coords, endCell.coords);
            view.toggleSolveButtonCaption(false);
        }
        model.maze.render();
    });

    function getNavigationInstructions() {
      const MOUSE_INSTRUCTIONS = 'Нажмите ЛКМ для передвижения по лабиринту',
          ALT_SHIFT_INSTRUCTIONS = `Удерживая нажатой кнопку <b>SHIFT</b>, вы переместитесь как можно дальше в одном  +
            направлении.<br><br>Удерживая нажатыми <b>ALT</b> и <b>SHIFT</b>, вы переместитесь в следующий перекресток`;

        return {
            [SHAPE_SQUARE]: `${MOUSE_INSTRUCTIONS} или используйте стрелочки на клавиатуре<br><br>${ALT_SHIFT_INSTRUCTIONS}`,
        }[model.shape];
    }

    view.on(EVENT_PLAY_BUTTON_CLICKED, () => {
        const [startCell, endCell] = findStartAndEndCells();
        if (!(startCell && endCell)) {
            alert('Чтобы начать игру, следует сгенерировать лабиринт');
            return;
        }
        model.maze.clearPathAndSolution();
        model.playState = {startCell, endCell, currentCell: startCell, startTime: Date.now()};
        startCell.metadata[METADATA_PLAYER_CURRENT] = true;
        startCell.metadata[METADATA_PLAYER_VISITED] = true;
        model.maze.render();
        stateMachine.playing();
        view.setNavigationInstructions(getNavigationInstructions());
    });

    view.on(EVENT_STOP_BUTTON_CLICKED, () => {
        model.maze.clearMetadata(METADATA_PLAYER_CURRENT, METADATA_PLAYER_VISITED);
        model.maze.render();
        stateMachine.displaying();
    });

    const keyCodeToDirection = {
        38: DIRECTION_NORTH,
        40: DIRECTION_SOUTH,
        39: DIRECTION_EAST,
        37: DIRECTION_WEST,
        65: DIRECTION_NORTH_WEST, // A
        83: DIRECTION_NORTH_EAST, // S
        90: DIRECTION_SOUTH_WEST, // Z
        88: DIRECTION_SOUTH_EAST, // X
        81: DIRECTION_CLOCKWISE,  // Q
        87: DIRECTION_ANTICLOCKWISE, // W
        80: DIRECTION_INWARDS, // P
        76: `${DIRECTION_OUTWARDS}_1`, // L
        186: `${DIRECTION_OUTWARDS}_0` // ;
    };

    function padNum(num) {
        return num < 10 ? '0' + num : num;
    }
    function formatTime(millis) {
        const hours = Math.floor(millis / (1000 * 60 * 60)),
          minutes = Math.floor((millis % (1000 * 60 * 60)) / (1000 * 60)),
          seconds = Math.floor((millis % (1000 * 60)) / 1000);

        return `${padNum(hours)}:${padNum(minutes)}:${padNum(seconds)}`;
    }

    function onMazeCompleted() {
        const timeMs = Date.now() - model.playState.startTime,
          time = formatTime(timeMs),
          {startCell, endCell} = model.playState;

        model.playState.finished = true;

        model.maze.findPathBetween(startCell.coords, endCell.coords);
        const optimalPathLength = model.maze.metadata[METADATA_PATH].length;
        delete model.maze.metadata[METADATA_PATH];

        let visitedCells = 0;
        model.maze.forEachCell(cell => {
            if (cell.metadata[METADATA_PLAYER_VISITED]) {
                visitedCells++;
            }
        });

        model.maze.render();
        stateMachine.displaying();
        view.showInfo(`
            Время прохождения: ${time}<br>
            Посещённые: ${visitedCells}<br>
            Оптимальный маршрут: ${optimalPathLength}<br><br>
            Оптимальность: <em>${Math.floor(100 * optimalPathLength / visitedCells)}%</em><br>
        `);
    }

    function navigate(direction, shift, alt) {
        while (true) {
            const currentCell = model.playState.currentCell,
              targetCell = currentCell.neighbours[direction],
              moveOk = targetCell && targetCell.isLinkedTo(currentCell);

            if (moveOk) {
                delete currentCell.metadata[METADATA_PLAYER_CURRENT];
                targetCell.metadata[METADATA_PLAYER_VISITED] = true;
                targetCell.metadata[METADATA_PLAYER_CURRENT] = true;
                model.playState.previousCell = currentCell;
                model.playState.currentCell = targetCell;

                if (targetCell.metadata[METADATA_END_CELL]) {
                    onMazeCompleted();
                }

                if (model.playState.finished) {
                    break;
                } else if (!shift) {
                    break;
                } else if (alt) {
                    const linkedDirections = targetCell.neighbours.linkedDirections();
                    if (linkedDirections.length === 2) {
                        direction = linkedDirections.find(neighbourDirection => targetCell.neighbours[neighbourDirection] !== model.playState.previousCell);
                    } else {
                        break;
                    }
                }

            } else {
                break;
            }
        }
    }

    view.on(EVENT_KEY_PRESS, ifStateIs(STATE_PLAYING).then(event => {
        const {keyCode, shift, alt} = event,
          direction = keyCodeToDirection[keyCode];

        navigate(direction, shift, alt);

        model.maze.render();
    }));
};
