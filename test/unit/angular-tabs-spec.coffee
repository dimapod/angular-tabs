describe "Angular Tabs", ->
  welcomeTpl = 'Welcome from test'
  typeVolatile = 'typeVolatile'

  beforeEach ->
    angular.module("angular-tabs-test", [])
      .config ($uiTabsProvider) ->
        $uiTabsProvider
          .welcome {template: welcomeTpl}
          .tab typeVolatile, { template: 'Volatile tab template', title: 'Volatile tab title' }

    module "angular-tabs", "angular-tabs-test"

  beforeEach ->
    inject (_$rootScope_, _$uiTabs_) ->
      @$rootScope = _$rootScope_
      @$uiTabs = _$uiTabs_

  beforeEach ->
    @$rootScope.$apply()
    @welcomeTab = @$uiTabs.getActiveTab()

  describe "getTabs method", ->
    it "should return no tabs", ->
      tabs = @$uiTabs.getTabs()
      expect(tabs).not.toBe(undefined)
      expect(tabs.length).toBe(0)

  describe "getActive tab", ->
    it "should has welcome tab as active", ->
      expect(@welcomeTab).not.toBe(undefined)
      expect(@welcomeTab.template).toBe(welcomeTpl)
      expect(@welcomeTab.$$tabId).not.toBe(undefined)
      expect(@welcomeTab.$selected).toBe(true)

  describe "addTab method", ->
    iit "should deselect welcome tab when add a new tab", ->
      @$uiTabs.addTab(typeVolatile)
      @$rootScope.$apply()

      expect(@welcomeTab.$selected).toBe(false)

    it "should add new volatile tab with default options", ->
      @$uiTabs.addTab(typeVolatile)
      @$rootScope.$apply()

      tabs = @$uiTabs.getTabs()
      expect(tabs).not.toBe(undefined)
      expect(tabs.length).toBe(1)

      tab = @$uiTabs.getActiveTab()
      expect(tab).not.toBe(undefined)
      expect(tab.template).toBe('Volatile tab template')
      expect(tab.title).toBe('Volatile tab title')
      expect(tab.$selected).toBe(true)

    it "should add new volatile tab with custom options", ->
      @$uiTabs.addTab(typeVolatile, {template: 'Custom volatile tab template', title: 'Custom volatile tab title'})
      @$rootScope.$apply()

      tabs = @$uiTabs.getTabs()
      expect(tabs).not.toBe(undefined)
      expect(tabs.length).toBe(1)

      tab = @$uiTabs.getActiveTab()
      expect(tab).not.toBe(undefined)
      expect(tab.template).toBe('Custom volatile tab template')
      expect(tab.title).toBe('Custom volatile tab title')
      expect(tab.$selected).toBe(true)



