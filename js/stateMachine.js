import {buildEventTarget} from './lib/utils.js';

export const STATE_INIT = 'Init',
    STATE_DISPLAYING = 'Displaying',
    STATE_RUNNING_ALGORITHM = 'Running Algorithm',
    STATE_PLAYING = 'Playing';

export function buildStateMachine() {
    "use strict";
    const eventTarget = buildEventTarget('stateMachine'),
        EVENT_STATE_CHANGED = 'stateChanged';
    let state = STATE_INIT;

    function ifStateIsOneOf(...validStates) {
        return {
            thenChangeTo(newState) {
                if (validStates.includes(state)) {
                    console.debug('State changed to', newState);
                    state = newState;
                    eventTarget.trigger(EVENT_STATE_CHANGED, newState);

                } else if (state === newState) {
                    console.debug('Ignoring redundant state transition', state);

                } else {
                    console.warn(`Unexpected state transition requested: ${state} -> ${newState}`);
                }
            }
        }
    }

    return {
        get state() {
            return state;  
        },
        init() {
            ifStateIsOneOf(STATE_DISPLAYING)
                .thenChangeTo(STATE_INIT);
        },
        displaying() {
            ifStateIsOneOf(STATE_INIT, STATE_RUNNING_ALGORITHM)
                .thenChangeTo(STATE_DISPLAYING);
        },
        playing() {
            ifStateIsOneOf(STATE_DISPLAYING)
              .thenChangeTo(STATE_PLAYING);
        },
        runningAlgorithm() {
            ifStateIsOneOf(STATE_INIT, STATE_DISPLAYING)
                .thenChangeTo(STATE_RUNNING_ALGORITHM);
        },
        onStateChange(handler) {
            eventTarget.on(EVENT_STATE_CHANGED, handler);
        }
    };

}