import {buildEventTarget} from './utils.js';

export const EVENT_CLICK = 'click';

export const drawingSurfaces = {
    canvas(config) {
        const eventTarget = buildEventTarget('drawingSurfaces.canvas'),
          {el} = config,
          ctx = el.getContext('2d');


        function onClick(event) {
            eventTarget.trigger(EVENT_CLICK, {
                x: invXCoord(event.offsetX),
                y: invYCoord(event.offsetY),
                rawX: event.offsetX,
                rawY: event.offsetY,
                shift: event.shiftKey,
                alt: event.altKey
            });
        }

        el.addEventListener(EVENT_CLICK, onClick);

        let magnification = 1, xOffset, yOffset;

        function xCoord(x) {
            return xOffset + x * magnification;
        }

        function invXCoord(x) {
            return (x - xOffset) / magnification;
        }

        function yCoord(y) {
            return yOffset + y * magnification;
        }

        function invYCoord(y) {
            return (y - yOffset) / magnification;
        }

        function distance(d) {
            return d * magnification;
        }

        return {
            clear() {
                ctx.clearRect(0, 0, el.width, el.height);
            },
            setSpaceRequirements(requiredWidth, requiredHeight, shapeSpecificLineWidthAdjustment = 1) {
                const {width, height} = el,
                  GLOBAL_LINE_WIDTH_ADJUSTMENT = 0.1,
                  verticalLineWidth = height * GLOBAL_LINE_WIDTH_ADJUSTMENT * shapeSpecificLineWidthAdjustment / requiredHeight,
                  horizontalLineWidth = width * GLOBAL_LINE_WIDTH_ADJUSTMENT * shapeSpecificLineWidthAdjustment / requiredWidth,
                  lineWidth = Math.min(verticalLineWidth, horizontalLineWidth);

                magnification = Math.min((width - lineWidth) / requiredWidth, (height - lineWidth) / requiredHeight);
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                xOffset = lineWidth / 2;
                yOffset = lineWidth / 2;
            },
            setColour(colour) {
                ctx.strokeStyle = colour;
                ctx.fillStyle = colour;
            },
            line(x1, y1, x2, y2, existingPath = false) {
                existingPath || ctx.beginPath();
                ctx.moveTo(xCoord(x1), yCoord(y1));
                ctx.lineTo(xCoord(x2), yCoord(y2));
                existingPath || ctx.stroke();
            },
            fillPolygon(...xyPoints) {
                ctx.beginPath();
                xyPoints.forEach(({x, y}, i) => {
                    if (i) {
                        ctx.lineTo(xCoord(x), yCoord(y));
                    } else {
                        ctx.moveTo(xCoord(x), yCoord(y));
                    }
                });
                ctx.closePath();
                ctx.fill();
            },
            convertCoords(x, y) {
                return [xCoord(x), yCoord(y)];
            },
            on(eventName, handler) {
                eventTarget.on(eventName, handler);
            },
            dispose() {
                eventTarget.off();
                el.removeEventListener(EVENT_CLICK, onClick);
            }
        };
    }
};