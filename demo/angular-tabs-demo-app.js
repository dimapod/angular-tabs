'use strict';
angular.module('angular-tabs.demo', ['angular-tabs']);

angular.module('angular-tabs.demo').config(function ($uiTabsProvider) {

    $uiTabsProvider
        .tab('tab1', {
            title: 'Tab 1',
            templateUrl: 'tabs/tab1.html',
            controller: 'tab1Ctrl'
        })
        .tab('tab2', {
            title: 'Tab 2',
            templateUrl: 'tabs/tab2.html',
            controller: 'tab2Ctrl'
        });

});

angular.module('angular-tabs.demo').controller('angularTabsDemoCtrl', function ($scope, $uiTabs) {
    console.log('$uiTabs', $uiTabs);

    $uiTabs.addTab('tab1');
    $uiTabs.addTab('tab2');

    var index = 3;

    $scope.addTab = function() {
        $uiTabs.addTab('tab1', {title: 'Tab '+(index++)});
    };

    $scope.tabs = $uiTabs.getTabs();

});
