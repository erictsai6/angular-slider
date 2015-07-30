/*
 angular-slider
 (c) 2013-2014 Venturocket, Inc. http://github.com/Venturocket
  License: MIT

  Modified by erictsai6

  Removed dual band feature and added in presetValues
 */
angular.module('ghs.directives.slider', ['ngTouch']).directive('slider',
	['$timeout', '$document', '$interpolate', '$swipe',
		function($timeout, $document, $interpolate, $swipe) {
            'use strict';

            /**
             * How sticky the knobs
             * @type {number}
             */
            var KNOB_STICKINESS = 3;

            /**
             * You want custom start and end symbols? You can have custom start and end symbols
             * @type {string}
             */
            var startSymbol = $interpolate.startSymbol(), endSymbol = $interpolate.endSymbol();

            /**
             * Convert a regular element to an jqlite element
             * @param {object} element
             * @returns {object} the new element
             */
            function angularize(element) {
                return angular.element(element);
            }

            /**
             * Adds px to the number and converts it to a string
             * @param {(string|Number)} position
             * @returns {string}
             */
            function pixelize(position) {
                return '' + position + 'px';
            }

            /**
             * Sets opacity of element
             * @param {object} element
             * @param {Number} opacity
             * @returns {object} the element
             */
            function setOpacity(element, opacity) {
                return element.css({
                    opacity: opacity
                });
            }

            /**
             * Sets the element's opacity to 0
             * @param {object} element
             * @returns {object} the element
             */
            function hide(element) {
                return setOpacity(element, 0);
            }

            /**
             * Sets the element's opacity to 1
             * @param {object} element
             * @returns {object} the element
             */
            function show(element) {
                return setOpacity(element, 1);
            }

            /**
             * offsets the element from the left the given amount
             * @param {object} element
             * @param {Number|string} position
             * @returns {object} the element
             */
            function offset(element, position) {
                return element.css({
                    left: position
                });
            }

            /**
             * Determines the width of the element
             * @param {object} element
             * @returns {number}
             */
            function width(element) {
                var w = parseFloat(element.css('width'));
                return isNaN(w) ? element[0].offsetWidth : w;
            }

            /**
             * Returns half of the width of the element
             * @param {object} element
             * @returns {number}
             */
            function halfWidth(element) {
                return width(element) / 2;
            }

            /**
             * Determine the amount of space to the left of the element
             * @param {object} element
             * @returns {Number}
             */
            function offsetLeft(element) {
                try {return element.offset().left;} catch(e) {}
                return element[0].getBoundingClientRect().left; // + scrollX;
            }

            /**
             * Compute the gap between the two given elements
             * @param {object} element1
             * @param {object} element2
             * @returns {number}
             */
            function gap(element1, element2) {
                if(offsetLeft(element1) > offsetLeft(element2)) {
                    return offsetLeft(element1) - offsetLeft(element2) - width(element2);
                }
                return offsetLeft(element2) - offsetLeft(element1) - width(element1);
            }

            /**
             * Binds the given html string to the given element
             * @param {object} element
             * @param {string} html
             * @returns {object} the element
             */
            function bindHtml(element, html) {
                return element.attr('ng-bind-template', html);
            }

            /**
             * Computes the nearest full step
             * @param {Number} [value = 0]
             * @param {Number} [precision = 0]
             * @param {Number} [step = 1/Math.pow(10, precision)]
             * @param {Number} [minLimit = 0]
             * @param {Number} [maxLimit]
             * @returns {Number}
             */
            function roundToStep(value, precision, step, minLimit, maxLimit) {

                // precision is optional
                if(angular.isUndefined(precision) || !precision) {
                    precision = 0;
                }

                // step is optional
                if(angular.isUndefined(step) || !step || step === 0) {
                    step = 1 / Math.pow(10, precision);
                }

                // minLimit is optional
                if(angular.isUndefined(minLimit) || !minLimit) {
                    minLimit = 0;
                }

                // value is optional
                if(angular.isUndefined(value) || !value) {
                    value = 0;
                }

                // how far from a step is the value
                var remainder = (value - minLimit) % step;

                // round the value to a step
                var roundedValue = remainder > (step / 2) ? value + step - remainder : value - remainder;

                // maxLimit is optional
                if(angular.isUndefined(maxLimit) || !maxLimit) {
                    maxLimit = roundedValue;
                }

                // bring the value back in range
                roundedValue = Math.min(Math.max(roundedValue, minLimit), maxLimit);

                // set the precision
                return parseFloat(roundedValue.toFixed(precision));
            }

			/**
			 * Round the given number to an arbitrary step
			 * @param {number} value
			 * @param {number} step
			 * @returns {number}
			 */
			function roundTo(value, step) {
				return Math.floor((value / step) + 0.5) * step;
			}

            /**
             * Wraps the given expression in whatever start and end symbol this app uses
             * @param {string} exp
             * @returns {string}
             */
            function expression(exp) {
                return startSymbol + ' ' + exp + ' ' + endSymbol;
            }

            return {
                restrict: 'EA',
				require: 'ngModel',
                scope: {
                    presetValues       : '@',   // array of presetValues.  Setting this will override minLimit, maxLimit,
                                                // step/stepWidth

                    minLimit           : '@',   // the minimum possible value
                    maxLimit           : '@',   // the maximum possible value
                    step               : '@',   // how wide is each step, omit or set to 0 for no steps
                    stepWidth          : '@',   // alias of step to avoid collisions
                    precision          : '@',   // how many decimal places do we care about
                    stickiness         : '@',   // how sticky should the knobs feel
                    showSteps          : '@',   // show the step value bubbles?

                    ngModel            : '=',   // single knob/dual know low value binding
                    ngDisabled         : '=',   // should the slider be disabled?
                    ngChange           : '&',   // what should we do when a value is changed
                    translateFn        : '&',   // how to translate the values displayed in the bubbles
                    scaleFn            : '&',   // how to scale the values
                    inverseScaleFn     : '&',   // how to unscale the values

                    onStartFn          : '&',   // function to call when the start touch event is detected
                    onMoveFn           : '&',   // function to call when the move touch event is detected
                    onEndFn            : '&'   // function to call when the end touch event is detected
                },
                template: // bar background
                    '<span class="bar full"></span>' + // secondary bars used for dual knobs
                    '<span class="bar steps"><span class="bubble step" ng-repeat="step in stepBubbles()"></span></span>' + // step bubbles
                    '<span class="pointer unselected low"></span>' +  // the knobs

                    '<span class="bubble low"></span>' + // current value bubbles
                    '<span class="bubble minLimit"></span><span class="bubble maxLimit"></span>', // upper and lower limit bubbles

                compile: function(element, attributes) {
                    // are we gonna show the step bubbles?
                    var showSteps = attributes.showSteps;

					// are we using 'step' or 'step-width'?
					var stepWidth = attributes.stepWidth?'stepWidth':'step',

                    // init element references
                        refs,

                    // which properties do we want to use?
                        refSelected = 'ngModel',

                    // which properties to we want to watch for changes?
                        watchables = ['presetValues', 'minLimit', 'maxLimit', 'stickiness', refSelected];

                    /**
                     * Get references to all the children of the given element
                     * @param {object} [el = element]
                     * @returns {Array} the children of el
                     */
                    function getReferences(el) {
                        if(!el) {
                            el = element;
                        }
                        var refs = [];
                        angular.forEach(el.children(), function(el) {
                            refs.push(angularize(el));
                        });
                        return refs;
                    }

                    /**
                     * Set the references for use later
                     * @param {Array} refs
                     */
                    function setReferences(refs) {
                        return {
                            fullBar     : refs[0],   // background bar
                            stepBubs    : refs[1],   // the steps bubbles
                            currPtr     : refs[2],   // single knob: the knob
                            currBub     : refs[3],   // single knob: the value bubble
                            minBub      : refs[4],   // the lower limit bubble
                            maxBub      : refs[5]   // the upper limit bubble
                        };
                    }

                    // set up the references
                    refs = (function() {

                        var _ref = getReferences();
                        var _results = [];
                        for(var _i = 0, _len = _ref.length; _i < _len; _i++) {
                            var e = _ref[_i];
                            e = angularize(e);
                            e.css({
                                'white-space': 'nowrap',
                                position     : 'absolute',
                                display      : 'block',
                                'z-index'    : 1
                            });
                            _results.push(e);
                        }
                        return _results;
                    })();
                    refs = setReferences(refs);

                    // set up the translation function
                    if(attributes.translateFn) {
                        attributes.$set('translateFn', '' + attributes.translateFn + '(value)');
                    }

                    // set up the encoding function
                    if(attributes.scaleFn) {
                        attributes.$set('scaleFn', '' + attributes.scaleFn + '(value)');
                    }

                    // set up the decoding function
                    if(attributes.inverseScaleFn) {
                        attributes.$set('inverseScaleFn', '' + attributes.inverseScaleFn + '(value)');
                    }

                    // set up the background bar so it fills the entire width of the slider
                    refs.fullBar.css({
                        left : 0,
                        right: 0
                    });

                    // set up bubbles
                    bindHtml(refs.stepBubs.children().eq(0), expression('translation(step)'));
                    bindHtml(refs.maxBub, expression('translation(maxLimit)'));
                    bindHtml(refs.minBub, expression('translation(minLimit)'));
                    bindHtml(refs.currBub, expression('translation(' + refSelected + ')'));

                    // start to compile watchables

                    // make sure the precision and step are first in the list
                    watchables.unshift('precision', stepWidth);

                    if(!showSteps) {
                        // we're not displaying the step bubbles this time
                        refs.stepBubs.children().remove();
                    }

                    return {
                        post: function(scope, element, attributes, ctrl) {
                            // re-set references locally to avoid any cross contamination and disassociation when using transcluded scopes (namely ng-repeat)
                            var refs = setReferences(getReferences(element));

                            /**
                             * Save the decoded values so we don't have to decode every time
                             * @type {{minLimit: number, maxLimit: number, step: number, precision: number, stickiness: number, ngModel: number, ngModel: number}}
                             */
                            scope.decodedValues = {
                                minLimit     : 0,
                                maxLimit     : 0,
                                step         : 0,
                                stepWidth    : 0,
                                precision    : 0,
                                stickiness   : 0,
                                ngModel      : 0
                            };

                            /**
                             * Apply the supplied translation function if necessary
                             * @param {(string|Number)} value
                             * @returns {string}
                             */
                            scope.translation = function(value) {
                                if (typeof value !== 'object') {
                                    value = parseFloat(value).toFixed(scope.precision);
                                }
                                if(angular.isUndefined(attributes.translateFn)) {
                                    return '' + value;
                                }
                                return scope.translateFn({value: value});
                            };

                            /**
                             * Encode the value given
                             * @param {number} value
                             * @returns {number}
                             */
                            scope.encode = function(value) {
                                if(angular.isUndefined(attributes.scaleFn) || !attributes.scaleFn) {
                                    if (scope.presetValues) {
                                        return scope.presetValues[value];
                                    }
                                    return value;
                                }
                                return scope.scaleFn({value: value});
                            };

                            /**
                             * Decode the value given
                             * @param {number} value
                             * @returns {number}
                             */
                            scope.decode = function(value) {
                                if(angular.isUndefined(attributes.inverseScaleFn) || !attributes.inverseScaleFn) {
                                    if (scope.presetValues) {
                                        for (var i = 0; i < scope.presetValues.length; i++) {
                                            if (typeof scope.presetValues[i] === 'object' &&
                                                typeof value === 'object' &&
                                                scope.presetValues[i].value === value.value) {
                                                return i;
                                            }
                                            else if (scope.presetValues[i] === value) {
                                                return i;
                                            }
                                        }
                                        return null;
                                    }
                                    return value;
                                }
                                return scope.inverseScaleFn({value: value});
                            };

                            if(!scope.presetValues && Math.round(scope.encode(scope.decode(1))) !== 1 || Math.round(scope.encode(scope.decode(100))) !== 100) {
                                console.warn('The scale and inverseScale functions are not perfect inverses: 1 = '+scope.encode(scope.decode(1))+'  100 = '+scope.encode(scope.decode(100)));
                            }

                            /**
                             * Decode the value of the given reference
                             * @param {string} ref
                             * @returns {number}
                             */
                            scope.decodeRef = function(ref) {
                                return scope.decode(scope[ref]);
                            };

                            /**
                             * How precise do the range inputs need to be?
                             * @returns {number}
                             */
                            scope.inputSteps = function() {
                                return Math.pow(10, scope.precision * -1);
                            };

                            /**
                             * The width of the background bar
                             * @type {number}
                             */
                            var barWidth = 0;

                            /**
                             * Half the width of the knob/bar in use
                             * @type {number}
                             */
                            var pointerHalfWidth = 0;

                            /**
                             * Left most possible position
                             * @type {number}
                             */
                            var minOffset = 0;

                            /**
                             * Right most possible position
                             * @type {number}
                             */
                            var maxOffset = 0;

                            /**
                             * How much width do we have to work with
                             * @type {number}
                             */
                            var offsetRange = 0;

                            /**
                             * The minimum value of the slider
                             * @type {number}
                             */
                            var minValue = 0;

                            /**
                             * The minimum value of the slider (decoded)
                             * @type {number}
                             */
                            var minValueDecoded = 0;

                            /**
                             * The maximum value of the slider
                             * @type {number}
                             */
                            var maxValue = 0;

                            /**
                             * The maximum value of the slider (decoded)
                             * @type {number}
                             */
                            var maxValueDecoded = 0;

                            /**
                             * The total range of the slider
                             * @type {number}
                             */
                            var valueRange = 0;

                            /**
                             * The total range of the slider (decoded)
                             * @type {number}
                             */
                            var valueRangeDecoded = 0;

							/**
							 * The normalized width in percent of a step
							 * @type {number}
							 */
							var stepRange = 1;

                            /**
                             * How far from a step is the low knob?
                             * @type {number}
                             */
                            var stickyOffset = 0;

                            /**
                             * Have the events been bound to the necessary inputs/elements
                             * @type {boolean}
                             */
                            var eventsBound = false;

                            /**
                             * Update the necessary dimensions
                             */
                            function dimensions() {

                                // make sure the watchables are all valid
                                angular.forEach(watchables, function(watchable) {

                                    // parse them to floats
                                    if (watchable === 'presetValues') {
                                        if (typeof scope.presetValues === 'string') {
                                            scope.presetValues = JSON.parse(scope.presetValues);
                                        }
                                    } else if (typeof scope[watchable] !== 'object') {
                                        scope[watchable] = parseFloat(scope[watchable]);
                                    }

                                    if (watchable === 'presetValues' && scope[watchable]) {
                                        scope.minLimit = scope.presetValues[0];
                                        scope.maxLimit = scope.presetValues[scope.presetValues.length - 1];
                                    } else if(watchable === refSelected) {
                                        // this is the low or high value so bring them back in line with the steps
                                        if (scope.presetValues) {

                                        } else {
                                            scope[watchable] = roundToStep(scope[watchable], scope.precision, scope[stepWidth], scope.minLimit, scope.maxLimit);
                                        }
                                    } else if(watchable === 'stickiness') {
                                        // make sure the stickiness is valid
                                        if(isNaN(scope.stickiness)) {
                                            scope.stickiness = KNOB_STICKINESS;
                                        } else if(scope.stickiness < 1) {
                                            scope.stickiness = 1;
                                        }
                                    }

                                    // save the decoded values
                                    if (watchable !== 'presetValues') {
                                        scope.decodedValues[watchable] = scope.decodeRef(watchable);
                                    }
                                });

                                // save the various dimensions we'll need
                                barWidth = width(refs.fullBar);
                                pointerHalfWidth = halfWidth(refs.currPtr);

                                minOffset = offsetLeft(refs.fullBar);
                                maxOffset = minOffset + barWidth - width(refs.currPtr);
                                offsetRange = maxOffset - minOffset;

                                minValue = scope.minLimit;
                                minValueDecoded = scope.decodedValues.minLimit;
                                maxValue = scope.maxLimit;
                                maxValueDecoded = scope.decodedValues.maxLimit;
                                valueRange = maxValue - minValue;
                                valueRangeDecoded = maxValueDecoded - minValueDecoded;

								stepRange = roundTo(valueRangeDecoded, scope.decodedValues[stepWidth]);
                            }

                            /**
                             * Lets make everything look good
                             */
                            function updateDOM() {

                                var pointer,        // The knob/bar is being dragged
                                    ref;            // The value should we be changing

                                // update the dimensions
                                dimensions();

                                // set the limit bubble positions
                                offset(refs.minBub, 0);
                                offset(refs.maxBub, pixelize(barWidth - width(refs.maxBub)));

                                /**
                                 * Get the offset percentage from the given absolute offset
                                 * @param {number} offset
                                 * @returns {number}
                                 */
                                function percentFromOffset(offset) {
                                    return ((offset - minOffset) / offsetRange) * 100;
                                }

                                /**
                                 * Get the offset percentage from the given decoded value
                                 * @param {number} value
                                 * @returns {number}
                                 */
                                function percentFromDecodedValue(value) {
									var percent = value - minValueDecoded;
									if(valueRange === valueRangeDecoded) {
										percent = roundTo(percent, scope.decodedValues[stepWidth]) / stepRange;
									} else {
										percent /= valueRangeDecoded;
									}
                                    return percent * 100;
                                }

                                /**
                                 * Returns percent from the preset index
                                 * @param index
                                 */
                                function percentFromPresetIndex(index) {
                                    return index / (scope.presetValues.length - 1) * 100;
                                }

                                /**
                                 * Get the offset percentage from the given value
                                 * @param {number} value
                                 * @returns {number}
                                 */
                                function percentFromValue(value) {
                                    return percentFromDecodedValue(scope.decode(value));
                                }

                                /**
                                 * Takes in a percent and sets it to a presetPercentage
                                 * Must work in tandem with presetValues
                                 * @param percent
                                 */
                                function usePresetPercent(percent) {
                                    return Math.round(percent / 100 * (scope.presetValues.length-1)) / (scope.presetValues.length - 1) * 100;
                                }

                                /**
                                 * Takes in a percent and sets it to a presetIndex
                                 * @param percent
                                 */
                                function getPresetIndex(percent) {
                                    return Math.round(percent/100 * (scope.presetValues.length - 1));
                                }

                                /**
                                 * Get the absolute offset (in px) from the given offset percentage
                                 * @param {number} percent
                                 * @returns {string}
                                 */
                                function offsetFromPercent(percent) {
                                    return pixelize(percent * offsetRange / 100);
                                }

                                /**
                                 * Bring the offset back in range of the slider
                                 * @param {number} offset
                                 * @returns {number}
                                 */
                                function bringOffsetInRange(offset) {
                                    return Math.min(Math.max(offset, minOffset), maxOffset);
                                }

                                /**
                                 * Bring the element back within the confines of the slider
                                 * @param {object} element
                                 * @returns {Object}
                                 */
                                function fitToBar(element) {
                                    return offset(element, offsetFromPercent(percentFromOffset(bringOffsetInRange(offsetLeft(element)))));
                                }

                                /**
                                 * Compute the amount of stretch
                                 * @param {number} percent the mouse offset from the start position
                                 * @param {number} [maxPercent = 100] the maximum stretch
                                 * @param {boolean} [end = false] are we beyond the max stretch?
                                 * @returns {number}
                                 */
                                function percentStretch(percent, maxPercent, end) {

                                    // which direction?
                                    var sign = percent > 0 ? 1 : -1;

                                    // if the maxPercent is 0 or not given apply no limit (i.e. set it to 100)
                                    maxPercent = !maxPercent ? 100 : maxPercent;

                                    if(end) {
                                        // compute the max stretch amount
                                        return (
                                                   Math.sin((
                                                                Math.min(Math.abs(percent / maxPercent), 1) * Math.PI
                                                                ) - (Math.PI / 2)) + 1
                                                   ) * sign * maxPercent / 6;
                                    }

                                    // compute the current stretch amount
                                    return (
                                        sign * Math.pow(Math.min(Math.abs(percent / maxPercent * 2), 1), scope.stickiness) * maxPercent / 2
                                        );
                                }

                                /**
                                 * Update the pointers in the DOM
                                 */
                                function setPointers() {

                                    /**
                                     * The base percent for the low knob
                                     * @type {number}
                                     */
                                    var rawLowPercent;
                                    if (scope.presetValues) {
                                        rawLowPercent = percentFromPresetIndex(scope.decodedValues[refSelected]);
                                    } else {
                                        rawLowPercent = percentFromDecodedValue(scope.decodedValues[refSelected]);
                                    }

                                    /**
                                     * The width in percent of a step above the low value
                                     * @type {number}
                                     */
                                    var stepWidthPercentAboveLow = percentFromValue(scope[refSelected] + scope[stepWidth]) - rawLowPercent;

                                    /**
                                     * The width in percent of a step below the low value
                                     * @type {number}
                                     */
                                    var stepWidthPercentBelowLow = rawLowPercent - percentFromValue(scope[refSelected] - scope[stepWidth]);

                                    /**
                                     * The percent for the low knob after the stretch has been applied
                                     * @type {number}
                                     */
                                    var stretchedLowPercent = rawLowPercent + percentStretch(stickyOffset, stickyOffset > 0?stepWidthPercentAboveLow:stepWidthPercentBelowLow);

                                    // set the low knob's and bubble's new positions
                                    offset(refs.currPtr, offsetFromPercent(stretchedLowPercent));
                                    offset(refs.currBub,
                                        offsetFromPercent(percentFromOffset(offsetLeft(refs.currPtr) - halfWidth(refs.currBub) + pointerHalfWidth)));
                                }

                                /**
                                 * Update the bubbles in the DOM
                                 */
                                function adjustBubbles() {

                                    // make sure the low value bubble is actually within the slider
                                    fitToBar(refs.currBub);

                                    if(gap(refs.minBub, refs.currBub) < 5) {
                                        // the low bubble overlaps the minLimit bubble

                                        // so hide the minLimit bubble
                                        hide(refs.minBub);
                                    } else {
                                        // the low bubble doesn't overlap the minLimit bubble

                                        // single knob slider

                                        // so show the minLimit slider
                                        show(refs.minBub);

                                    }

                                    if(gap(refs.currBub, refs.maxBub) < 5) {
                                        // the low bubble overlaps the maxLimit bubble

                                        // so hide the maxLimit bubble
                                        hide(refs.maxBub);
                                    } else {
                                        // the low bubble doesn't overlap the maxLimit bubble

                                        // no overlap

                                        // so show the maxLimit bubble
                                        show(refs.maxBub);
                                    }
                                }

                                /**
                                 * What to do when dragging ends
                                 */
                                function onEnd() {

                                    // reset the offsets
                                    stickyOffset = 0;

                                    if(pointer) {
                                        // if we have a pointer reference

                                        // update all the elements in the DOM
                                        setPointers();
                                        adjustBubbles();

                                        // the pointer is no longer active
                                        pointer.removeClass('active');

                                        if (scope.onEndFn) {
                                          scope.onEndFn();
                                        }
                                    }

                                    // reset the references
                                    pointer = null;
                                    ref = null;

                                }

                                /**
                                 * What to do when the knob/bar is moved
                                 * @param {object} event
                                 */
                                function onMove(event) {
                                    if(pointer) {
                                        // we have a reference to a knob/bar

                                        scope.$apply(function() {

                                            /**
                                             * The current x position of the mouse/finger/etc.
                                             * @type {number}
                                             */
                                            var currentX = event.clientX || event.x || event.changedTouches[0].clientX;

                                            /**
                                             * The new offset for the knob being dragged
                                             * @type {number}
                                             */
                                            var newOffset = bringOffsetInRange(currentX + minOffset - offsetLeft(element) - halfWidth(pointer));

                                            /**
                                             * The new offset percent for the knob being dragged
                                             * @type {number}
                                             */
                                            var newPercent = percentFromOffset(newOffset);

                                            // If we use presetValues then we should set the newPercent according to the index size of presetValues;
                                            if (scope.presetValues) {
                                                newPercent = usePresetPercent(newPercent);
                                                scope.decodedValues[ref] = getPresetIndex(newPercent);
                                                scope[ref] = scope.encode(scope.decodedValues[ref]);
                                            } else {
                                                var newValue = scope.encode(minValueDecoded + (valueRangeDecoded * newPercent / 100.0));

                                                // set the sticky offset for the low knob
                                                stickyOffset = newPercent;

                                                // round the new value and assign it
                                                scope[ref] = newValue = roundToStep(newValue, scope.precision,
                                                    scope[stepWidth], scope.minLimit, scope.maxLimit);
                                                scope.decodedValues[ref] = scope.decodeRef(ref);
                                                stickyOffset = stickyOffset - percentFromValue(newValue);
                                            }

											if(scope.ngChange) {
												scope.ngChange();
											}
											ctrl.$setViewValue(scope[refSelected]);

                                            // update the DOM
                                            setPointers();
                                            adjustBubbles();

                                        });

                                        if (scope.onMoveFn) {
                                            scope.onMoveFn();
                                        }
                                    }
                                }

                                /**
                                 * What to do when a knob/bar is starting to be dragged
                                 * @param {object} event
                                 * @param {object} ptr
                                 * @param {string} rf
                                 */
                                function onStart(event, ptr, rf) {

									if(scope.ngDisabled && scope.ngDisabled === true) {
                                        return;
                                    }

									event.preventDefault();

                                    // save the pointer reference
                                    pointer = ptr;

                                    // save the a reference to the model
                                    ref = rf;

                                    // set the knob/bar to active
                                    pointer.addClass('active');

                                    if (scope.onStartFn) {
                                        scope.onStartFn();
                                    }

                                    onMove(event);
                                }

                                /**
                                 * Bind the various events to the various DOM elements
                                 */
                                function setBindings() {
                                    // we're using normal DOM elements

                                    /**
                                     * Start event
                                     * @param {object} elem
                                     * @param {string} rf
                                     * @param {object} [ptr]
                                     */
                                    var bindSwipeStart = function(elem, rf, ptr) {

                                        // make sure the element has all the methods and properties we'll need
                                        elem = angularize(elem);

                                        // if no pointer reference is supplied, reference the element given
                                        if(angular.isUndefined(ptr)) {
                                            ptr = elem;
                                        } else {
                                            ptr = angularize(ptr);
                                        }

                                        // bind the swipe start event to the element
                                        $swipe.bind(elem, {
                                            start: function(coords, ev) {
                                                onStart(ev, ptr, rf);
                                            }
                                        });
                                    };

                                    /**
                                     * Move event
                                     * @param {object} elem
                                     */
                                    var bindSwipe = function(elem) {

                                        // make sure the element has all the methods and properties we'll need
                                        elem = angularize(elem);

                                        // bind the swipe move, end, and cancel events
                                        $swipe.bind(elem, {
                                            move  : function(coords, ev) {
                                                onMove(ev);
                                            },
                                            end   : function(coords, ev) {
                                                onMove(ev);
                                                onEnd();
                                            },
                                            cancel: function(coords, ev) {
                                                onEnd(ev);
                                            }
                                        });
                                    };

                                    // bind the common events to the various common elements
                                    bindSwipe($document);
                                    bindSwipeStart(refs.currPtr, refSelected);
                                    bindSwipeStart(refs.currBub, refSelected);
                                    bindSwipeStart(refs.minBub, refSelected, refs.currPtr);

                                    // bind the single knob specific events to the single knob specific elements
                                    bindSwipeStart(refs.maxBub, refSelected, refs.currPtr);
                                    bindSwipeStart(refs.fullBar, refSelected, refs.currPtr);


                                }

                                // update the DOM
                                setPointers();
                                adjustBubbles();

                                if(!eventsBound) {
                                    // the events haven't been bound yet

                                    // so bind the events, damnit!
                                    setBindings();
                                    eventsBound = true;
                                }
                            }

                            // update the DOM when one of the watchables changes
                            for(var i = 0; i < watchables.length; i++) {
                                scope.$watch(watchables[i], updateDOM);
                            }

                            // update the DOM when the window resizes
                            angularize(window).bind('resize', updateDOM);

                            // listen for a refresh event
                            scope.$on('refreshSlider', function() {
                                // update the DOM, but make sure everything has been digested first
                                $timeout(updateDOM);
                            });

                            // wait for everything to be digested then set up the DOM
                            $timeout(updateDOM);
                        }
                    };
                }
            };
        }
	]);
