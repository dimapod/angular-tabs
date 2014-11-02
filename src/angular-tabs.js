'use strict';

angular.module('angular-tabs', [])
    .provider('$uiTabs', function () {

        /**
         *
         */
        var TabDefinition = function () {
            this.$dirty       = false;
            this.$selected    = false;
            this.$volatile    = true;
            this.$data        = {};
        };
        TabDefinition.prototype.onClose = ['$q', function ($q) {
            return function () {
                // TODO $q.defer().resolve().promise;
                var deferred = $q.defer();
                deferred.resolve();
                return deferred.promise;
            };
        }];

        /**
         * Map of tab definitions
         */
        var tabDefinitions = {
            null: {template: ''}
        };

        /**
         *
         * @param type       {string}
         * @param definition {Object}
         * @returns          {Object} self
         */
        this.tab = function (type, definition) {
            tabDefinitions[type] = angular.extend(
                {}, definition
            );
            return this;
        };

        /**
         *
         * @param definition {Object}
         * @returns          {Object} self
         */
        this.welcome = function (definition) {
            return this.tab(null, definition);
        };

        /**
         *
         * @param handler {function}
         */
        this.onClose = function (handler) {
            TabDefinition.prototype.onClose = handler;
        };

        /*
         *
         */
        function initTab(type, options) {
            var tabDefinition = tabDefinitions[type];
            if (!tabDefinition) {
                return undefined;
            }

            return angular.extend(new TabDefinition(), tabDefinition, options || {});
        }

        /*
         *
         */
        function remove(array, callback) {
            var index  = -1,
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
                arr    : [],
                map    : {},
                history: []
                // TODO save currentTab
            };



            /**
             * Return a tab object
             * @param id tab id
             * @returns {tab}
             */
            var getTab = function (id) {
                return TABS.map[id];
            };

            var removeTab = function (id) {
                var tab = getTab(id);

                $q.when(tab).
                    then(function () {
                        if (tab.onClose) {
                            var fn = angular.isString(tab.onClose) ? $injector.get(tab.onClose) : $injector.invoke(tab.onClose);
                            return fn(tab);
                        }
                    }).
                    // after tab close resolved
                    then(function () {
                        removeTabIntern(tab);
                    });
            };

            var removeTabIntern = function (tab) {
                remove(TABS.history, function (tabId) {
                    return tabId === tab.$$tabId;
                });

                if (tab.$selected && TABS.history.length > 0) {
                    selectTab(TABS.history[TABS.history.length - 1]);
                }

                cleanTabScope(tab);
                TABS.arr.splice(TABS.arr.indexOf(tab), 1);
                delete TABS.map[tab.$$tabId];
                $rootScope.$broadcast('$tabRemoveSuccess', tab);
            };

            var getActiveTab = function () {

                function filter(collection, callback) {
                    var result = [];
                    angular.forEach(collection, function (value, index, collection) {
                        if (callback(value, index, collection)) {
                            result.push(value);
                        }
                    });
                    return result;
                }


                var selectedTabs = filter(TABS.map, function (tab) {
                    return tab.$selected;
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
                return TABS.arr; // clone ?
            };

            /*
             Private
             */
            var cleanTabScope = function (tab) {
                if (tab.scope) {
                    tab.scope.$destroy();
                    tab.scope = null;
                }
            };

            /**
             * Add a new tab
             * @param type type of a tab described with $uiTabsProvider
             * @param options init tab options (title, disabled)
             * @param id (optional) tab's unique id. If 'id' exists, tab content of this tab will be replaced
             * @returns {Promise(tab)}
             */
            var addTab = function (type, options, id) {
                var newTab = initTab(type, options);
                if (!newTab) {
                    throw new Error('Unknown tab type: ' + type);
                }

                newTab.$$tabId = id || Math.random().toString(16).substr(2);

                return loadTabIntern(newTab).then(function(newTab) {
                    var find = getTab(newTab.$$tabId);
                    if (!find) {
                        // Add Tab
                        if (type !== null) {
                            TABS.arr.push(newTab);
                        }
                        TABS.map[newTab.$$tabId] = newTab;
                    } else {
                        // Replace tab
                        cleanTabScope(find);
                        angular.copy(newTab, find);
                    }

                    return selectTab(newTab.$$tabId);
                }, function (error) {
                    $rootScope.$broadcast('$tabAddError', newTab, error);
                });
            };

            /**
             * Select an existing tab
             * @param tabId tab id
             * @returns {tab}
             */
            function loadTabIntern(next) {
                // TODO $rootScope.$broadcast('$tabChangeStart', next);

                return $q.when(next).
                    then(function () {
                        var locals = angular.extend({}, next.resolve),
                            template, templateUrl;

                        angular.forEach(locals, function (value, key) {
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
                                    then(function (response) {
                                        return response.data;
                                    });
                            }
                        }
                        if (angular.isDefined(template)) {
                            locals.$template = template;
                        }

                        return $q.all(locals);
                    }).then(function(locals) {
                        next.locals = locals;
                        return next;
                    });
            }

            /**
             * Select an existing tab
             * @param tabId tab id
             * @returns {tab}
             */
            function selectTab(tabId) {
                var next = getTab(tabId),
                    last = getActiveTab();

                if (next && last && next.$$tabId === last.$$tabId) {
                    $rootScope.$broadcast('$tabUpdate', last);
                } else if (next) {
                    $rootScope.$broadcast('$tabChangeStart', next, last);

                    if (last) {
                        last.$selected = false;
                    }

                    next.$selected = true;
                    remove(TABS.history, function (tabId) {
                        return tabId === tabId;
                    });
                    TABS.history.push(tabId);

                    $rootScope.$broadcast('$tabChangeSuccess', next, last);
                } else {
                    $rootScope.$broadcast('$tabChangeError', next, 'Cloud not found tab with id #' + tabId);
                }
                return next;
            }

            // Add welcome tab
            addTab(null);

            /**
             * Public API
             */
            return {
                addTab: addTab,
                getTabs: getTabs,
                getTab: getTab,
                removeTab: removeTab,
                selectTab: selectTab,
                getActiveTab: getActiveTab
            };
        };
    })
    .directive('tabView', function ($uiTabs, $anchorScroll, $animate) {
        return {
            restrict: 'ECA',
            terminal: true,
            priority: 400,
            transclude: 'element',
            link: function (scope, $element, attr, ctrl, $transclude) {
                var currentScope,
                    currentElement,
                    previousElement,
                    autoScrollExp = attr.autoscroll,
                    onloadExp = attr.onload || '',
                    elems = {};

                function remove(event, tab) {
                    if (tab.$selected === false) {
                        var elem = elems[tab.$$tabId];
                        if (elem) {
                            delete elems[tab.$$tabId];
                            elem.remove();
                            elem = null;
                        }
                    }
                }

                function cleanupLastView() {
                    var id = currentElement && currentElement.data('$$tabId');
                    var tab = $uiTabs.getTab(id);
                    if (previousElement) {
                        previousElement.remove();
                        previousElement = null;
                    }
                    if (currentScope && tab === undefined) {
                        currentScope.$destroy();
                        currentScope = null;
                    }
                    if (currentElement) {
                        if (tab) {
                            $animate.addClass(currentElement, 'ng-hide');
                            previousElement = null;
                        } else {
                            $animate.leave(currentElement, function () {
                                previousElement = null;
                            });
                            previousElement = currentElement;
                            currentElement = null;
                        }
                    }
                }

                function update(event, currentTab) {
                    var elem = elems[currentTab.$$tabId];
                    if (elem) {
                        $animate.removeClass(elem, 'ng-hide');
                        cleanupLastView();
                        currentElement = elem;
                        return;
                    }

                    var locals = currentTab && currentTab.locals,
                        template = locals && locals.$template;

                    if (angular.isDefined(template)) {
                        var newScope = scope.$new();
                        newScope.$$tabId = currentTab.$$tabId;

                        if (currentTab.$volatile !== false) {
                            newScope.$data = currentTab.$data;
                        }

                        newScope.$setTabDirty = function () {
                            currentTab.$dirty = true;
                        };

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

                        currentElement = clone;

                        currentScope = newScope;
                        if (currentTab.$volatile === false) {
                            currentElement.data('$$tabId', currentTab.$$tabId);
                            elems[currentTab.$$tabId] = currentElement;
                            currentTab.scope = newScope;
                        }

                        newScope.$emit('$tabContentLoaded');
                        newScope.$eval(onloadExp);
                    } else {
                        cleanupLastView();
                    }
                }

                scope.$on('$tabChangeSuccess', update);
                scope.$on('$tabRemoveSuccess', remove);

            }
        };
    })
    .directive('tabView', function ($compile, $controller, $uiTabs) {
        return {
            restrict: 'ECA',
            priority: -400,
            link: function (scope, $element) {
                var current = $uiTabs.getActiveTab(),
                    locals = current.locals;

                $element.html(locals.$template);
                $element.addClass('xl-tab-system-view');

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

                scope.$$currentTabId = current.$$tabId;

                link(scope);

            },
            controller: function ($scope) {
                this.$$getCurrentTabId = function () {
                    return $scope.$$currentTabId;
                };
            }
        };
    })
    .directive('closeUiTab', function ($uiTabs) {
        return {
            restrict: 'ECA',
            priority: -400,
            require: '^tabView',
            link: function (scope, $element, attr, tabViewCtrl) {
                $element.on('click', function () {
                    $uiTabs.removeTab(tabViewCtrl.$$getCurrentTabId());
                });
            }
        };
    })
    .directive('tabHeader', function ($uiTabs, $window, $timeout, $injector, $q) {
        return {
            restrict: 'ECA',
            priority: -400,
            template: '<div class="xl-components ui-tab-header" ui-tab-menu-dropdown>\n    <div class="ui-tab-header-wrapper">\n        <ul class="ui-tab-header-container">\n            <li class="ui-tab-header-item" ng-class="{active: tab.$selected}" data-ng-repeat="tab in tabs"\n                data-ng-click="selectTab(tab, $index)">\n                <span class="asterisk" ng-show="tab.$dirty">*</span>\n                <span class="ui-tab-header-title">{{tab.title}}</span>\n                <span class="ui-tab-header-close" data-ng-click="closeTab(tab)"></span>\n            </li>\n        </ul>\n    </div>\n\n    <span class="ui-tab-header-menu-toggle" ui-tab-menu-dropdown-toggle ng-show="showTabMenuHandler"></span>\n    <div class="ui-tab-header-menu">\n        <ul>\n            <li class="ui-tab-header-menu-item" data-ng-repeat="tab in tabs" data-ng-click="selectTab(tab, $index)">\n                <span class="ui-tab-header-menu-item-title">{{tab.title}}</span>\n            </li>\n        </ul>\n    </div>\n</div>\n',
            scope: {},
            link: function (scope, elem, attr) {

                function debounce(func, wait, immediate) {
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

                var container = elem.find('ul.ui-tab-header-container');
                var wrapper = elem.find('div.ui-tab-header-wrapper');
                var lastSelectedIndex;

                scope.tabs = $uiTabs.getTabs();
                scope.selectTab = function (tab, index) {
                    $uiTabs.selectTab(tab.$$tabId);
                    scrollToTab(index);
                };
                scope.closeTab = function (tab) {
                    $uiTabs.removeTab(tab.$$tabId);
                };

                scope.$watchCollection('tabs', function (tabs) {
                    $timeout(function () {
                        var index = tabs.indexOf($uiTabs.getActiveTab());
                        if (index !== -1) {
                            scrollToTab(index);
                        }
                    });
                });

                var scrollToTab = function (index) {
                    var left;
                    if (container.outerWidth() + container.position().left < wrapper.innerWidth()) {
                        // Trim space in the right (when deletion or window resize)
                        left = Math.min((wrapper.innerWidth() - container.outerWidth() ), 0);
                    }

                    scope.showTabMenuHandler = wrapper.innerWidth() < container.outerWidth();

                    if (index !== undefined) {
                        var li = elem.find('li.ui-tab-header-item:nth-child(' + (index + 1) + ')');
                        var leftOffset = container.position().left;

                        if (leftOffset + li.position().left < 0) {
                            // Scroll to active tab at left
                            left = -li.position().left;
                        } else {
                            // Scroll to active tab at right
                            var liOffset = li.position().left + li.outerWidth() + leftOffset;
                            if (liOffset > wrapper.innerWidth()) {
                                left = wrapper.innerWidth() + leftOffset - liOffset;
                            }
                        }
                    }

                    if (left !== undefined) {
                        container.css({left: left});
                    }

                    lastSelectedIndex = index;
                };

                var w = angular.element($window);
                w.bind('resize', debounce(function (event) {
                    scope.$apply(scrollToTab(lastSelectedIndex));
                }, 200));
            }
        };
    })
    .constant('dropdownConfig', {
        openClass: 'open'
    })

    .service('dropdownService', ['$document', function ($document) {
        var openScope = null;

        this.open = function (dropdownScope) {
            if (!openScope) {
                $document.bind('click', closeDropdown);
                $document.bind('keydown', escapeKeyBind);
            }

            if (openScope && openScope !== dropdownScope) {
                openScope.isOpen = false;
            }

            openScope = dropdownScope;
        };

        this.close = function (dropdownScope) {
            if (openScope === dropdownScope) {
                openScope = null;
                $document.unbind('click', closeDropdown);
                $document.unbind('keydown', escapeKeyBind);
            }
        };

        var closeDropdown = function (evt) {
            // This method may still be called during the same mouse event that
            // unbound this event handler. So check openScope before proceeding.
            if (!openScope) {
                return;
            }

            var toggleElement = openScope.getToggleElement();
            if (evt && toggleElement && toggleElement[0].contains(evt.target)) {
                return;
            }

            openScope.$apply(function () {
                openScope.isOpen = false;
            });
        };

        var escapeKeyBind = function (evt) {
            if (evt.which === 27) {
                openScope.focusToggleElement();
                closeDropdown();
            }
        };
    }])

    .controller('DropdownController', ['$scope', '$attrs', '$parse', 'dropdownConfig', 'dropdownService', '$animate', function ($scope, $attrs, $parse, dropdownConfig, dropdownService, $animate) {
        var self = this,
            scope = $scope.$new(), // create a child scope so we are not polluting original one
            openClass = dropdownConfig.openClass,
            getIsOpen,
            setIsOpen = angular.noop,
            toggleInvoker = $attrs.onToggle ? $parse($attrs.onToggle) : angular.noop;

        this.init = function (element) {
            self.$element = element;

            if ($attrs.isOpen) {
                getIsOpen = $parse($attrs.isOpen);
                setIsOpen = getIsOpen.assign;

                $scope.$watch(getIsOpen, function (value) {
                    scope.isOpen = !!value;
                });
            }
        };

        this.toggle = function (open) {
            scope.isOpen = arguments.length ? !!open : !scope.isOpen;
            return scope.isOpen;
        };

        // Allow other directives to watch status
        this.isOpen = function () {
            return scope.isOpen;
        };

        scope.getToggleElement = function () {
            return self.toggleElement;
        };

        scope.focusToggleElement = function () {
            if (self.toggleElement) {
                self.toggleElement[0].focus();
            }
        };

        scope.$watch('isOpen', function (isOpen, wasOpen) {
            $animate[isOpen ? 'addClass' : 'removeClass'](self.$element, openClass);

            if (isOpen) {
                scope.focusToggleElement();
                dropdownService.open(scope);
            } else {
                dropdownService.close(scope);
            }

            setIsOpen($scope, isOpen);
            if (angular.isDefined(isOpen) && isOpen !== wasOpen) {
                toggleInvoker($scope, {open: !!isOpen});
            }
        });

        $scope.$on('$locationChangeSuccess', function () {
            scope.isOpen = false;
        });

        $scope.$on('$destroy', function () {
            scope.$destroy();
        });
    }])

    .directive('uiTabMenuDropdown', function () {
        return {
            controller: 'DropdownController',
            link: function (scope, element, attrs, dropdownCtrl) {
                dropdownCtrl.init(element);
            }
        };
    })

    .directive('uiTabMenuDropdownToggle', function () {
        return {
            require: '?^uiTabMenuDropdown',
            priority: -500,
            link: function (scope, element, attrs, dropdownCtrl) {
                if (!dropdownCtrl) {
                    return;
                }

                dropdownCtrl.toggleElement = element;

                var toggleDropdown = function (event) {
                    event.preventDefault();

                    if (!element.hasClass('disabled') && !attrs.disabled) {
                        scope.$apply(function () {
                            dropdownCtrl.toggle();
                        });
                    }
                };

                element.bind('click', toggleDropdown);

                // WAI-ARIA
                element.attr({'aria-haspopup': true, 'aria-expanded': false});
                scope.$watch(dropdownCtrl.isOpen, function (isOpen) {
                    element.attr('aria-expanded', !!isOpen);
                });

                scope.$on('$destroy', function () {
                    element.unbind('click', toggleDropdown);
                });
            }
        };
    });



