/* global describe, beforeEach, spyOn, it, expect, inject  */
/* jshint jquery: true */
describe('Unit: Slider Directive', function() {
	'use strict';

	var $compile;
	var $rootScope;
	var $timeout;
	var $document;
	var element;

	beforeEach(module('vr.directives.slider'));

	beforeEach(inject(function(_$compile_, _$rootScope_,_$timeout_,_$document_) {
		$compile = _$compile_;
		$rootScope = _$rootScope_;
		$timeout = _$timeout_;
		$document = _$document_;
	}));

	describe('without range inputs and', function() {
		beforeEach(function() {
			window.AngularSlider = { inputtypes: { range: false } };
		});

		describe('with non-range data', function() {

			beforeEach(function() {
				$rootScope.skill = {
					value: 1,
					translate: function(value) {
						return '#'+value+'%';
					}
				};
				spyOn($rootScope.skill,'translate').andCallThrough();
				element = $compile('<slider floor="1" ceiling="3" step="0.25" precision="2" translate-fn="skill.translate" ng-model="skill.value"></slider>')($rootScope);
				$rootScope.$digest();
				$(element).find('span').css({'display':'block','position':'absolute'});
				$(element).find('.bar').width(500);
				$rootScope.$apply(function() { $rootScope.skill.value = 2; });
			});


			it('should create a new non-range slider', function() {
				expect(element.find('span').length).toBe(6);

				// should be only one bar
				var bar = element.find('.bar');
				expect(bar.length).toBe(2);
				expect(bar).toHaveClass('full');

				// should be only one pointer, and it should be in the right position
				var pointer = element.find('.pointer');
				expect(pointer.length).toBe(1);
				expect(pointer).toHaveClass('low');
				expect($(pointer).css('left')).toBe('250px');

				// should be 3 bubbles and should apply the precision and translate function to their texts
				expect(element.find('.bubble').length).toBe(3);
				expect(element.find('.bubble.floor').text()).toBe('#1.00%');
				expect(element.find('.bubble.ceiling').text()).toBe('#3.00%');
				expect(element.find('.bubble.low').text()).toBe('#2.00%');
			});

			it('should update the value when the pointer is clicked and dragged (mouse)', function() {
				var pointer = $(element).find('.pointer');

				// click and drag
				pointer.trigger($.Event('mousedown',{clientX: 250}));
				$(document).trigger($.Event('mousedown',{clientX: 250}));
				$(document).trigger($.Event('mousemove',{clientX: 125}));
				$(document).trigger($.Event('mouseup',{clientX: 125}));

				expect($rootScope.skill.value).toBe(1.5);
				expect(pointer.css('left')).toBe('125px');
				expect(element.find('.bubble.low').text()).toBe('#1.50%');
			});

			it('should update the value when the pointer is tapped and slid (touch)', function() {
				var pointer = $(element).find('.pointer');

				// tap and slide
				pointer.trigger($.Event('touchstart',{clientX: 250}));
				$(document).trigger($.Event('touchstart',{clientX: 250}));
				$(document).trigger($.Event('touchmove',{clientX: 125}));
				$(document).trigger($.Event('touchend',{clientX: 125}));

				expect($rootScope.skill.value).toBe(1.5);
				expect(pointer.css('left')).toBe('125px');
				expect(element.find('.bubble.low').text()).toBe('#1.50%');
			});

			it('should update the value when the bar is clicked', function() {

				// click the bar
				$(element).find('.bar').trigger($.Event('mousedown',{ clientX: 375 }));

				expect($rootScope.skill.value).toBe(2.5);
				expect(element.find('.pointer').css('left')).toBe('375px');
				expect(element.find('.bubble.low').text()).toBe('#2.50%');

			});

			it('should respect the step', function() {
				var pointer = $(element).find('.pointer');

				// click and drag
				pointer.trigger($.Event('mousedown',{clientX: 250}));
				$(document).trigger($.Event('mousedown',{clientX: 250}));
				$(document).trigger($.Event('mousemove',{clientX: 200}));
				$(document).trigger($.Event('mouseup',{clientX: 200}));

				expect($rootScope.skill.value).toBe(1.75);
				expect(pointer.css('left')).toBe('187.5px');
				expect(element.find('.bubble.low').text()).toBe('#1.75%');
			});

		});
	});

    describe('with a scaling function', function() {

        beforeEach(function() {
            window.AngularSlider = { inputtypes: { range: true } };
            $rootScope.skill = {
                value: 1.5,
                values: {
                    low: 3,
                    high: 16
                },
                sq   : function(value) {
                    return Math.pow(value, 2);
                },
                sqRt : function(value) {
                    return Math.sqrt(value);
                }
            };
        });

        describe('and non-range data', function() {

            beforeEach(function() {
                element = $compile('<slider floor="1" ceiling="9" precision="2" scale-fn="skill.sq" inverse-scale-fn="skill.sqRt" ng-model="skill.value"></slider>')($rootScope);
                $rootScope.$digest();
                $(element).find('span').css({'display':'block','position':'absolute'});
                $(element).find('.bar.full').width(400);
                $rootScope.$apply(function() { $rootScope.skill.value = 1; });
            });

            it('should scale the value according to a squaring function', function() {
                var input = $(element).find('.input.low');

                input.trigger($.Event('mousedown',{ clientX: 0 }));
                input.trigger($.Event('mousemove',{ clientX: 200 }));
                input.trigger($.Event('mouseup',{clientX: 200}));

                expect($rootScope.skill.value).toBe(4.00);
                expect($(element).find('.bubble.low').text()).toBe('4.00');
            });

        });

    });

    describe('in an ngRepeat', function() {

        beforeEach(function() {
            window.AngularSlider = { inputtypes: { range: true } };
            $rootScope.skills = [
                {
                    floor: 1,
                    ceiling: 3,
                    value: 1.5,
                    precision: 2
                },
                {
                    floor: 1,
                    ceiling: 3,
                    value: 1.5,
                    precision: 2
                }
            ];
            element = $compile(
                '<div><div ng-repeat="skill in skills">' +
                    '<slider id="slider{{ $index+1 }}" floor="{{ skill.floor }}" ceiling="{{ skill.ceiling }}" precision="{{ skill.precision }}" ng-model="skill.value"></slider>' +
                '</div></div>')($rootScope);
            $rootScope.$digest();
            $(element).find('span').css({'display':'block','position':'absolute'});
            $(element).find('.bar.full').width(400);
            $rootScope.$apply(function() { $rootScope.skills[0].value = 2; });
        });

        it('should only move the first slider', function() {

            var slider = $(element).find('#slider1');
            var input = slider.find('.input.low');

            // click the first slider
            input.trigger($.Event('mousedown',{ clientX: 300 }));

            expect($rootScope.skills[0].value).toBe(2.50);
            expect(slider.find('.pointer.low').css('left')).toBe('300px');
            expect(slider.find('.bubble.low').text()).toBe('2.50');

            expect($rootScope.skills[1].value).toBe(1.5);

        });
    });

    describe('with stickiness', function() {

        beforeEach(function() {
            window.AngularSlider = { inputtypes: { range: true } };
            $rootScope.skill = 1.5;
            element = $compile('<slider floor="1" ceiling="3" stickiness="4" precision="2" step="0.5" ng-model="skill"></slider>')($rootScope);
            $rootScope.$digest();
            $(element).find('span').css({'display':'block','position':'absolute'});
            $(element).find('.bar.full').width(400);
            $rootScope.$apply(function() { $rootScope.skill = 2; });
        });

        it('should apply some stickiness when dragged', function() {
            var input = $(element).find('.input.low');

            input.trigger($.Event('mousedown',{ clientX: 200 }));
            input.trigger($.Event('mousemove',{ clientX: 245 }));

            expect($rootScope.skill).toBe(2.00);
            var left = parseFloat($(element).find('.pointer.low').css('left'));
            expect(left).toBeLessThan(245);
            expect(left).toBeGreaterThan(200);
            expect($(element).find('.bubble.low').text()).toBe('2.00');
        });
    });

    describe('with non-range data', function() {
        beforeEach(function() {
            window.AngularSlider = { inputtypes: { range: true } };
            $rootScope.skill = 1.5;
            $rootScope.change = function() {};
            element = $compile('<slider floor="1" ceiling="3" precision="2" step="0.5" ng-model="skill" ng-change="change()"></slider>')($rootScope);
            $rootScope.$digest();
            $(element).find('span').css({'display':'block','position':'absolute'});
            $(element).find('.bar.full').width(400);
            $rootScope.$apply(function() { $rootScope.skill = 2; });
        });

		it('should be pristine', function() {
			expect(element).toHaveClass('ng-pristine');
		});

		it('should be dirty after moving the knob', function() {

            var input = $(element).find('.input.low');

            input.trigger($.Event('mousedown',{ clientX: 200 }));
            input.trigger($.Event('mousemove',{ clientX: 245 }));

			expect(element).toHaveClass('ng-dirty');
		});

		it('should fire the change event', function() {
			spyOn($rootScope, 'change');
			var input = $(element).find('.input.low');

			input.trigger($.Event('mousedown',{ clientX: 200 }));
			input.trigger($.Event('mousemove',{ clientX: 245 }));

			expect($rootScope.change).toHaveBeenCalled();
		});

	});

	describe('with non-range data', function() {

		beforeEach(function() {
			window.AngularSlider = { inputtypes: { range: true } };
			$rootScope.skill = 1.5;
			$rootScope.disabled = false;
			element = $compile('<slider floor="1" ceiling="3" precision="2" ng-model="skill" ng-disabled="disabled"></slider>')($rootScope);
			$rootScope.$digest();
			$(element).find('span').css({'display':'block','position':'absolute'});
			$(element).find('.bar.full').width(400);
			$rootScope.$apply(function() { $rootScope.skill = 2; });
		});

		it('should move when disabled is false', function() {

			var input = $(element).find('.input.low');

			input.trigger($.Event('mousedown',{ clientX: 200 }));
			input.trigger($.Event('mousemove',{ clientX: 300 }));

			expect($rootScope.skill).toBeCloseTo(2.5);
		});

		it('should not move when disabled is true', function() {
			$rootScope.disabled = true;
			$rootScope.$digest();
			var input = $(element).find('.input.low');

			input.trigger($.Event('mousedown',{ clientX: 200 }));
			input.trigger($.Event('mousemove',{ clientX: 300 }));

			expect($rootScope.skill).toBe(2);
		});

	});

	describe('with "step-width" attribute', function() {

		beforeEach(function() {
			window.AngularSlider = { inputtypes: { range: true } };
			$rootScope.skill = 1.5;
			$rootScope.disabled = false;
			element = $compile('<slider floor="1" ceiling="3" precision="2" step-width="0.25" show-steps="true" ng-model="skill"></slider>')($rootScope);
			$rootScope.$digest();
			$(element).find('span').css({'display':'block','position':'absolute'});
			$(element).find('.bar.full').width(400);
			$rootScope.$apply(function() { $rootScope.skill = 2; });
		});

		it('should respect the step width', function() {

			var input = $(element).find('.input.low');

			input.trigger($.Event('mousedown',{ clientX: 200 }));
			input.trigger($.Event('mousemove',{ clientX: 320 }));

			expect($rootScope.skill).toBe(2.5);
		});

	});

});
