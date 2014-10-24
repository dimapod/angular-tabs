module.exports = (grunt) ->
  require("load-grunt-tasks")(grunt)

  devDir = "src"
  testDir = "test"
  distDir = "dist"
  ghPagesDir = "gh-pages"

  grunt.initConfig
    connect:
      server:
        options:
          port: 4545
          base: "."

    watch:
      styles:
        files: "#{devDir}/**/*.less"
        tasks: ["less:dist"]
#      js:
#        files: "#{devDir}/**/*.js"
#        tasks: ["concat"]
      partials:
        files: "#{devDir}/**/*.html"
        tasks: ["ngtemplates"]

    karma:
      unit:
        configFile: "#{testDir}/unit/karma.unit.js"

    protractor:
      options:
        configFile: "#{testDir}/e2e/protractor.conf.js"
        keepAlive: false
      run: {}

    jshint:
      options:
        jshintrc: ".jshintrc"
        reporter: require('jshint-stylish')
      all: ["src/**/*.js"]

    clean:
      dist:
        files: [{
          dot: true,
          src: [
            "#{distDir}"
          ]
        }]

    less:
      dev:
        files: [
          expand: true
          cwd: "#{devDir}/styles"
          src: "angular-tabs.less"
          dest: "#{devDir}/styles"
          ext: ".css"
        ]
      dist:
        files: [
          expand: true
          cwd: "#{devDir}/styles"
          src: "angular-tabs.less"
          dest: "#{distDir}/styles"
          ext: ".css"
        ]

    concat:
      js:
        src: [
          "#{devDir}/angular-tabs.js",
          "#{devDir}/**/*.js"
        ]
        dest: "#{distDir}/angular-tabs.js"

    ngtemplates:
      options:
        standalone: true
        module: "angularTabs.templates"
      app:
        src: "#{devDir}/**/*.html"
        dest: "#{distDir}/angular-tabs-templates.js"

    release:
      options:
        npm: false

    copy:
      ghPages:
        files: [
            expand: true
            src: [
              "#{distDir}/**"
              "bower_components/**"
              "index.html"
              "test/e2e/index.html"
              "test/e2e/page.css"
            ]
            dest: "#{ghPagesDir}"
        ]

    ngmin:
      dist:
        files:
          "dist/angular-tabs.js": "#{distDir}/angular-tabs.js"

    'gh-pages':
      options:
        base: 'gh-pages'
      src: ['**']

  # Start express server
  grunt.registerTask('express', 'Start a custom web server', () ->
    #require('./server/server.js')
  )

  grunt.registerTask "default", ["build", "express", "watch"]

  grunt.registerTask "build", ["clean", "ngtemplates", "jshint", "less:dist", "concat", "ngmin"]

  grunt.registerTask "unit", ["jshint", "karma"]
  grunt.registerTask "e2e", ["build", "express", "protractor"]
  grunt.registerTask "test", ["unit", "e2e"]

  grunt.registerTask "publish", ["build", "test", "release"]
  grunt.registerTask "publish:minor", ["build", "test", "release:minor"]
  grunt.registerTask "publish:major", ["build", "test", "release:major"]

  grunt.registerTask "ghPages", ["copy:ghPages", "gh-pages"]
