gulp        = require("gulp")
clean       = require("gulp-clean")
concat      = require("gulp-concat")
uglify      = require("gulp-uglify")
less        = require("gulp-less")
ngAnnotate  = require("gulp-ng-annotate")
plumber     = require("gulp-plumber")
runSequence = require("run-sequence")
minifyCSS   = require("gulp-minify-css")
rename      = require("gulp-rename")

sources =
  less: "src/styles/*.less"
  js  : "src/*.js"

destinations =
  root  : "dist/"
  styles: "dist/styles"

gulp.task "clean", ->
  gulp.src(destinations.root, {read: false})
    .pipe clean()

gulp.task "build-css", ->
  gulp.src sources.less
    .pipe less()
    .pipe plumber()
    .pipe gulp.dest destinations.styles
    .pipe minifyCSS()
    .pipe rename({ extname: '.min.css'})
    .pipe gulp.dest destinations.styles

gulp.task "build-js", ->
  gulp.src sources.js
    .pipe ngAnnotate()
    .pipe concat "angular-tabs.js"
    .pipe gulp.dest destinations.root
    .pipe uglify()
    .pipe rename({ extname: '.min.js'})
    .pipe gulp.dest destinations.root

gulp.task "watch", ->
  gulp.watch sources.less, ["build-css"]
  gulp.watch sources.js, ["build-js"]

gulp.task "build", ->
  runSequence "clean", ["build-css", "build-js"]

gulp.task "serve", ->
  runSequence "build", "watch"
