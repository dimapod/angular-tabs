'use strict';

angular.module('angular-tabs.demo').controller('tab1Ctrl', function ($scope) {
    $scope.$data.model = $scope.$data.model || 'Model provided from tab1Ctrl';
});
