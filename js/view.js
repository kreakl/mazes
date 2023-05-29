import {buildEventTarget} from './lib/utils.js';

export const
    EVENT_SIZE_PARAMETER_CHANGED = 'mazeSizeParameterChanged',
    EVENT_DELAY_SELECTED = 'runModeSelected',
    EVENT_ALGORITHM_SELECTED = 'algorithmSelected',
    EVENT_GO_BUTTON_CLICKED = 'goButtonClicked',
    EVENT_FINISH_RUNNING_BUTTON_CLICKED = 'finishRunningButtonClicked',
    EVENT_CHANGE_PARAMS_BUTTON_CLICKED = 'changeParamsButtonClicked',
    EVENT_KEY_PRESS = 'keyPress',
    EVENT_EXITS_SELECTED = 'exitsSelected',
    EVENT_SOLVE_BUTTON_CLICKED = 'solveButtonClicked',
    EVENT_PLAY_BUTTON_CLICKED = 'playButtonClicked',
    EVENT_STOP_BUTTON_CLICKED = 'stopButtonClicked';


import {STATE_INIT, STATE_DISPLAYING, STATE_RUNNING_ALGORITHM, STATE_PLAYING} from './stateMachine.js';

export function buildView(model, stateMachine) {
    "use strict";

    const eventTarget = buildEventTarget('view'),
        elCanvas = document.getElementById('maze'),
        elMazeContainer = document.getElementById('mazeContainer'),
        elGoButton = document.getElementById('go'),
        elFinishRunningButton = document.getElementById('finishRunning'),
        elChangeParamsButton = document.getElementById('changeParams'),
        elInfo = document.getElementById('info'),
        elSeedInput = document.getElementById('seedInput'),
        elSizeParameterList = document.getElementById('sizeParameters'),
        elSeedParameterList = document.getElementById('seedParameters'),
        elMazeAlgorithmList = document.getElementById('algorithmSelector'),
        elMazeAlgorithmListSecond = document.getElementById('otherAlgorithmSelector'),
        elAlgorithmDelayList = document.getElementById('delaySelector'),
        elExitsList = document.getElementById('exitSelector'),
        elSolveButton = document.getElementById('solve'),
        elPlayButton = document.getElementById('play'),
        elStopButton = document.getElementById('stop'),
        headers = document.querySelectorAll(".menu-header"),
        icons = document.querySelectorAll(".icon"),
        contents = document.querySelectorAll(".menu-content");

    elGoButton.onclick = () => eventTarget.trigger(EVENT_GO_BUTTON_CLICKED);
    elFinishRunningButton.onclick = () => eventTarget.trigger(EVENT_FINISH_RUNNING_BUTTON_CLICKED);
    elChangeParamsButton.onclick = () => eventTarget.trigger(EVENT_CHANGE_PARAMS_BUTTON_CLICKED);
    elSolveButton.onclick = () => eventTarget.trigger(EVENT_SOLVE_BUTTON_CLICKED);
    elPlayButton.onclick = () => eventTarget.trigger(EVENT_PLAY_BUTTON_CLICKED);
    elStopButton.onclick = () => eventTarget.trigger(EVENT_STOP_BUTTON_CLICKED);
    for (let i = 0; i < headers.length; i++) {
        headers[i].addEventListener('click', () => {
            contents[i].style.display = contents[i].style.display === 'block' ? 'none' : 'block';
            icons[i].innerHTML = contents[i].style.display == "block" ? "-" : "+";
        })
    }

    window.onkeydown = event => eventTarget.trigger(EVENT_KEY_PRESS, {keyCode: event.keyCode, alt: event.altKey, shift: event.shiftKey});

    function toggleElementVisibility(el, display) {
        el.style.display = display ? 'block' : 'none';
    }

    function fitCanvasToContainer() {
        elCanvas.width = elMazeContainer.clientWidth;
        elCanvas.height = elMazeContainer.clientHeight;
    }

    fitCanvasToContainer();

    return {
        // Size
        clearSizeParameters() {
            elSizeParameterList.innerHTML = '';
        },
        addSizeParameter(name, minimumValue, maximumValue) {
            const elParameterItem = document.createElement('li'),
                elParameterName = document.createElement('label'),
                elParameterValue = document.createElement('input');

            elParameterName.innerHTML = name;

            elParameterValue.setAttribute('type', 'number');
            elParameterValue.setAttribute('required', 'required');
            elParameterValue.setAttribute('min', minimumValue);
            elParameterValue.setAttribute('max', maximumValue);
            elParameterValue.oninput = () => eventTarget.trigger(EVENT_SIZE_PARAMETER_CHANGED, {
                name,
                value: Number(elParameterValue.value)
            });
            elParameterValue.dataset.value = name;

            elParameterItem.appendChild(elParameterName);
            elParameterItem.appendChild(elParameterValue);
            elSizeParameterList.appendChild(elParameterItem);
        },
        setSizeParameter(name, value) {
            const elParamInput = [...elSizeParameterList.querySelectorAll('input')].find(el => el.dataset.value === name);
            elParamInput.value = value;
        },

        // Exits
        addExitConfiguration(description, value) {
            const elExitsItem = document.createElement('li');
            elExitsItem.innerHTML = description;
            elExitsItem.onclick = () => eventTarget.trigger(EVENT_EXITS_SELECTED, value);
            elExitsList.appendChild(elExitsItem);
            elExitsItem.dataset.value = value;
        },
        setExitConfiguration(exitConfiguration) {
            [...elExitsList.querySelectorAll('li')].forEach(el => {
                el.classList.toggle('selected', el.dataset.value === exitConfiguration);
            });
        },

        toggleSolveButtonCaption(solve) {
            elSolveButton.innerHTML = solve ? 'Решить' : 'Очистить решение';
        },

        // Algorithm Delay
        addAlgorithmDelay(description, value) {
            const elDelayItem = document.createElement('li');
            elDelayItem.innerHTML = description;
            elDelayItem.onclick = () => eventTarget.trigger(EVENT_DELAY_SELECTED, value);
            elAlgorithmDelayList.appendChild(elDelayItem);
            elDelayItem.dataset.value = value;
        },
        setAlgorithmDelay(algorithmDelay) {
            [...elAlgorithmDelayList.querySelectorAll('li')].forEach(el => {
                el.classList.toggle('selected', Number(el.dataset.value) === algorithmDelay);
            });
        },

        // Algorithm
        clearAlgorithms() {
            elMazeAlgorithmList.innerHTML = '';
           elMazeAlgorithmListSecond.innerHTML = '';
        },
        addAlgorithm(description, type, algorithmId) {
            const elAlgorithmItem = document.createElement('li');
            elAlgorithmItem.innerHTML = description;
            elAlgorithmItem.onclick = () => eventTarget.trigger(EVENT_ALGORITHM_SELECTED, {algorithmId, type});
            if (type === 'other') {
                elMazeAlgorithmListSecond.appendChild(elAlgorithmItem);
            } else {
                elMazeAlgorithmList.appendChild(elAlgorithmItem);
            }
            elAlgorithmItem.dataset.value = algorithmId;
        },
        setAlgorithm(algorithmId, type) {
            if (type === 'other') {
                Array.from(elExitsList.children).slice(1).forEach((el) => el.classList.add('disabled'));
                [...elMazeAlgorithmListSecond.querySelectorAll('li')].forEach(el => {
                    el.classList.toggle('selected', el.dataset.value === algorithmId);
                });
                [elSolveButton, elPlayButton].forEach((el) => el.classList.add('disabled'));
            } else {
                Array.from(elExitsList.children).slice(1).forEach((el) => el.classList.remove('disabled'));
                [...elMazeAlgorithmList.querySelectorAll('li')].forEach(el => {
                    el.classList.toggle('selected', el.dataset.value === algorithmId);
                });
                [elSolveButton, elPlayButton].forEach((el) => el.classList.remove('disabled'));
            }
        },

        getSeed() {
            return elSeedInput.value;
        },

        getValidSizeParameters() {
            return [...elSizeParameterList.querySelectorAll('input')].filter(elInput => elInput.checkValidity()).map(el => el.dataset.value);
        },

        inputErrorMessage() {
            const errors = [];

            [...elSizeParameterList.querySelectorAll('input')].forEach(elInput => {
                if (!elInput.checkValidity()) {
                    errors.push(`Введите число между ${elInput.min} и ${elInput.max} для ${elInput.dataset.value}`);
                }
            });

            if (!elSeedInput.checkValidity()) {
                errors.push('Для того, чтобы задать seed, введите число от 1 до 9');
            }

            return errors.join('\n');
        },

        updateForNewState(state) {
            toggleElementVisibility(elMazeAlgorithmList,  [STATE_INIT].includes(state));
            // toggleElementVisibility(elMazeAlgorithmListSecond,  [STATE_INIT].includes(state));
            toggleElementVisibility(elSizeParameterList,  [STATE_INIT].includes(state));
            toggleElementVisibility(elSeedParameterList,  [STATE_INIT].includes(state));
            toggleElementVisibility(elExitsList,          [STATE_INIT].includes(state));
            toggleElementVisibility(elAlgorithmDelayList, [STATE_INIT].includes(state));

            toggleElementVisibility(elGoButton,           [STATE_INIT, STATE_DISPLAYING].includes(state));

            toggleElementVisibility(elChangeParamsButton,    [STATE_DISPLAYING].includes(state));

            toggleElementVisibility(elFinishRunningButton, [STATE_RUNNING_ALGORITHM].includes(state));

            switch(state) {
                case STATE_INIT:
                    this.showInfo('Выберите параметры для построения лабиринта и затем нажмите <b>Новый лабиринт</b>');
                    break;
                case STATE_RUNNING_ALGORITHM:
                    this.showInfo('Генерация алгоритма была замедлена.<br><br>Нажмите ЗАКОНЧИТЬ, чтобы увидеть результат');
                    break;
                case STATE_PLAYING:
                    this.showInfo('');
                    break;
                case STATE_DISPLAYING:
                    this.showSeedValue();
                    this.toggleSolveButtonCaption(true);
                    break;
                default:
                    console.assert(false, 'unexpected state value: ' + state);
            }
        },

        showSeedValue() {
            this.showInfo(`Значение seed:<br><b>${model.randomSeed}</b>`);
        },
        showInfo(msg) {
            toggleElementVisibility(elInfo, msg);
            elInfo.innerHTML = msg;
        },
        setNavigationInstructions(instructions) {
            this.showInfo(instructions);
        },

        on(eventName, handler) {
            eventTarget.on(eventName, handler);
        }
    };
}