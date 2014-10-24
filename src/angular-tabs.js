(function(window, angular, undefined) {'use strict';

var uiTabsModule = angular.module('angular-tabs', []).provider('$uiTabs', $uiTabsProvider);

function $uiTabsProvider() {

    var tabs = {};

    this.tab = function (type, definition) {
        tabs[type] = angular.extend(
            new BaseTab(), definition
        );

        return this;
    };

    var BaseTab = function () {
        this.disabled = false;
        this.selected = false;
        this.initialized = false;
    };

    var initTab = function (type, options) {
        options = options || {};
        var tabProp = tabs[type];
        if (!tabProp) {
            return undefined;
        }
        return angular.extend(new BaseTab(), tabProp, options);
    };

    function filter(collection, callback) {
        var result = [];
        angular.forEach(collection, function(value, index, collection) {
            if (callback(value, index, collection)) {
                result.push(value);
            }
        });
        return result;
    }

    function remove(array, callback) {
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
    }

    this.$get = function ($rootScope, $injector, $sce, $http, $q, $templateCache) {
        /**
         * Basically TABS.arr & TABS.map contain the same tabs objects
         */
        var TABS = {
            arr: [],
            map: {},
            history: []
        };

        /**
         * Add a new tab
         * @param type type of a tab described with $uiTabsProvider
         * @param options init tab options (title, disabled)
         * @param id (optional) tab's unique id. If 'id' exists, tab content of this tab will be replaced
         */
        var addTab = function (type, options, id) {
            var newTab = initTab(type, options);
            
            if (!newTab) {
                throw new Error('Unknown tab type: ' + type);
            }

            newTab.$$id = id || Math.random().toString(16).substr(2);

            if (!!getTab(newTab.$$id)) {
                // Replace tab
                var currentTab = getTab(newTab.$$id);
                cleanTabScope(currentTab);
                angular.copy(newTab, currentTab);
            } else {
                // Add Tab
                TABS.arr.push(newTab);
                TABS.map[newTab.$$id] = newTab;
            }
            selectTab(newTab.$$id);
            return id;
        };

        /**
         * Return a tab object
         * @param id tab id
         * @returns {tab}
         */
        var getTab = function (id) {
            return TABS.map[id];
        };

        /**
         * Remove a tab
         * @param id tab id
         */
        var removeTab = function (id) {
            var tab = getTab(id);

            remove(TABS.history, function (tabId) {
                return tabId === id;
            });

            if (tab.selected && TABS.history.length > 0) {
                selectTab(TABS.history[TABS.history.length - 1]);
            } else if (TABS.history.length === 0) {
                //TODO
                console.log('Go to home??');
            }

            cleanTabScope(tab);
            TABS.arr.splice(TABS.arr.indexOf(tab), 1);
            delete TABS.map[id];
            $rootScope.$broadcast('$tabRemoveSuccess', id);
        };

        /**
         * Select an existing tab
         * @param id tab id
         * @returns {tab}
         */
        var selectTab = function (id) {
            return updateTabs(id);
        };

        var getActiveTab = function () {
            var selectedTabs = filter(TABS.arr, function (tab) {
                return tab.selected;
            });

            if (selectedTabs.length === 1) {
                return selectedTabs[0];
            } else if (selectedTabs.length === 0) {
                return undefined;
            } else if (selectedTabs.length > 1) {
                throw new Error('There should not be more than one selected tab at a time.');
            }
        };

        /**
         * Return all tabs
         * @returns {*}
         */
        var getTabs = function () {
            return TABS.arr;
        };

        /*
         Private
         */
        var cleanTabScope = function(tab) {
            if (tab.scope) {
                tab.scope.$destroy();
                tab.scope = null;
            }
        };

        /*
         Private
         */
        function updateTabs(nextTabId) {
            var next = getTab(nextTabId),
                last = getActiveTab();

            if (next && last && next.$$id === last.$$id) {
                $rootScope.$broadcast('$tabUpdate', last);
            } else if (next || last) {
                $rootScope.$broadcast('$tabChangeStart', next, last);


                angular.forEach(TABS.arr, function (tab) {
                    tab.selected = false;
                });

                next.selected = true;

                remove(TABS.history, function (tabId) {
                    return tabId === nextTabId;
                });
                TABS.history.push(nextTabId);

                $q.when(next).
                    then(function() {
                        if (next) {
                            var locals = angular.extend({}, next.resolve),
                                template, templateUrl;

                            angular.forEach(locals, function(value, key) {
                                locals[key] = angular.isString(value) ?
                                    $injector.get(value) : $injector.invoke(value);
                            });

                            if (angular.isDefined(template = next.template)) {
                                if (angular.isFunction(template)) {
                                    template = template(next.params);
                                }
                            } else if (angular.isDefined(templateUrl = next.templateUrl)) {
                                if (angular.isFunction(templateUrl)) {
                                    templateUrl = templateUrl(next.params);
                                }
                                templateUrl = $sce.getTrustedResourceUrl(templateUrl);
                                if (angular.isDefined(templateUrl)) {
                                    next.loadedTemplateUrl = templateUrl;
                                    template = $http.get(templateUrl, {cache: $templateCache}).
                                        then(function(response) { return response.data; });
                                }
                            }
                            if (angular.isDefined(template)) {
                                locals['$template'] = template;
                            }
                            return $q.all(locals);
                        }
                    }).
                    // after tab change
                    then(function(locals) {
                        if (next) {
                            next.locals = locals;
                        }
                        $rootScope.$broadcast('$tabChangeSuccess', next, last);
                    }, function(error) {
                        $rootScope.$broadcast('$tabChangeError', next, last, error);
                    });
            }
            return next;
        }

        /**
         * Public API
         */
        return {
            getTabs: getTabs,
            addTab: addTab,
            getTab: getTab,
            removeTab: removeTab,
            selectTab: selectTab,
            getActiveTab: getActiveTab
        };
    };
}

uiTabsModule.directive('tabView', tabViewFactory);
uiTabsModule.directive('tabView', tabViewFillContentFactory);

function tabViewFactory($uiTabs, $anchorScroll, $animate) {
    return {
        restrict: 'ECA',
        terminal: true,
        priority: 400,
        transclude: 'element',
        link: function (scope, $element, attr, ctrl, $transclude) {
            var
                currentElement,
                previousElement,
                autoScrollExp = attr.autoscroll,
                onloadExp = attr.onload || '',
                elems = {};

            scope.$on('$tabChangeSuccess', update);
            scope.$on('$tabRemoveSuccess', remove);
            update();

            function remove(event, id) {
                var elem = elems[id];
                if (elem) {
                    elem.removeData('$$id')
                    cleanupLastView()
                }
            }

            function cleanupLastView() {
                if (previousElement) {
                    previousElement.remove();
                    previousElement = null;
                }
                if (currentElement) {
                    var id = currentElement.data('$$id');
                    if (id) {
                        $animate.addClass(currentElement, 'ng-hide');
                    } else {
                        $animate.leave(currentElement, function () {
                            previousElement = null;
                        });
                        previousElement = currentElement;
                        currentElement = null;
                    }
                }
            }

            function update() {
                var currentTab = $uiTabs.getActiveTab();

                var elem = elems[currentTab.$$id];
                if (elem) {
                    $animate.removeClass(elem, 'ng-hide');
                    cleanupLastView();
                    currentElement = elem;
                    return;
                }

                var locals = currentTab && currentTab.locals,
                    template = locals && locals.$template;

                if (angular.isDefined(template)) {
                    var newScope = currentTab.scope || scope.$new();

                    // Note: This will also link all children of tab-view that were contained in the original
                    // html. If that content contains controllers, ... they could pollute/change the scope.
                    // However, using ng-view on an element with additional content does not make sense...
                    // Note: We can't remove them in the cloneAttchFn of $transclude as that
                    // function is called before linking the content, which would apply child
                    // directives to non existing elements.
                    var clone = $transclude(newScope, function (clone) {
                        $animate.enter(clone, null, currentElement || $element, function onNgViewEnter() {
                            if (angular.isDefined(autoScrollExp) && (!autoScrollExp || scope.$eval(autoScrollExp))) {
                                $anchorScroll();
                            }
                        });

                        cleanupLastView();
                    });

                    currentTab.scope = newScope;
                    currentElement = clone;

                    if (currentTab.volatile === false) {
                        currentElement.data("$$id", currentTab.$$id);
                        elems[currentTab.$$id] = currentElement;
                    }
                    newScope.$emit('$tabContentLoaded');
                    newScope.$eval(onloadExp);
                } else {
                    cleanupLastView();
                }
            }
        }
    };
}


function tabViewFillContentFactory($compile, $controller, $uiTabs) {
    return {
        restrict: 'ECA',
        priority: -400,
        link: function(scope, $element) {
            var current = $uiTabs.getActiveTab(),
                locals = current.locals;

            $element.html(locals.$template);

            var link = $compile($element.contents());

            if (current.controller) {
                locals.$scope = scope;
                var controller = $controller(current.controller, locals);
                if (current.controllerAs) {
                    scope[current.controllerAs] = controller;
                }
                $element.data('$ngControllerController', controller);
                $element.children().data('$ngControllerController', controller);
            }

            link(scope);
        }
    };
}

uiTabsModule.directive('tabHeader', tabHeaderFillContentFactory);

function tabHeaderFillContentFactory($uiTabs) {
    return {
        restrict: 'ECA',
        priority: -400,
        template: '<div class="ui-tab-header-container">\n  <span class="ui-tab-header" ng-class="{active: tab.selected}" data-ng-repeat="tab in tabs" data-ng-click="selectTab(tab)">\n    <span class="ui-tab-header-title">{{tab.title}}</span>\n    <span class="ui-tab-header-close" data-ng-click="closeTab(tab)">x</span>\n    __\n  </span>\n</div>',
        link: function(scope, elem, attr) {
            scope.tabs = $uiTabs.getTabs();

            scope.selectTab = function(tab) {
                $uiTabs.selectTab(tab.$$id);
            };
            scope.closeTab = function(tab) {
                $uiTabs.removeTab(tab.$$id);
            };
        }
    };
}


})(window, window.angular);