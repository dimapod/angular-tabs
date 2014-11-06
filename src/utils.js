'use strict';

angular.module('angular-tabs-utils', [])
    .service('utils', function () {

        return {
            remove: function (array, callback) {
                var index = -1,
                    length = array ? array.length : 0,
                    result = [];

                while (++index < length) {
                    var value = array[index];
                    if (callback(value, index, array)) {
                        result.push(value);
                        [].splice.call(array, index--, 1);
                        length--;
                    }
                }
                return result;
            },

            filter: function (collection, callback) {
                var result = [];
                angular.forEach(collection, function (value, index, collection) {
                    if (callback(value, index, collection)) {
                        result.push(value);
                    }
                });
                return result;
            },

            debounce: function (func, wait, immediate) {
                var args,
                    result,
                    thisArg,
                    timeoutId;

                function delayed() {
                    timeoutId = null;
                    if (!immediate) {
                        result = func.apply(thisArg, args);
                    }
                }

                return function () {
                    var isImmediate = immediate && !timeoutId;
                    args = arguments;
                    thisArg = this;

                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(delayed, wait);

                    if (isImmediate) {
                        result = func.apply(thisArg, args);
                    }
                    return result;
                };
            }
        };
    });