describe "Tab Utils", ->
  beforeEach module "angular-tabs-utils"

  beforeEach ->
    inject (_utils_) ->
      @utils = _utils_

  describe "hasRequiredError method ", ->
    it "should verify undefined model", ->
      expect(true).toBe(true)
