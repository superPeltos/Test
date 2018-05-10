// Requis
var gulp = require('gulp');
var config = require('../config.json');
var plugins = require('gulp-load-plugins')(); // tous les plugins de package.json
var browserify = require('gulp-browserify');




gulp.task('js', function () {
  return gulp.src(config.js.source + '*.js')

    .pipe(browserify({
      insertGlobals: true,
      debug: !gulp.env.production
    }))
    .pipe(plugins.plumber({
      errorHandler:
        plugins.notify.onError("Error: <%= error.message %>")
    }))


    .pipe(gulp.dest(config.js.dest));
});

// Tâche "js" = uglify + concat
gulp.task('js-lib', function() {
  return gulp.src(config.js.source + 'lib/*.js')
      .pipe(plugins.plumber({
          errorHandler:
             plugins.notify.onError("Error: <%= error.message %>")
      }))
    .pipe(plugins.uglify())
    .pipe(plugins.concat('lib.min.js'))
    .pipe(gulp.dest(config.js.dest));
});

// Tâche "js" = uglify + concat
gulp.task('js-components', function() {
  return gulp.src( config.js.source + 'components/*.js')
    .pipe(plugins.plumber({
      errorHandler:
        plugins.notify.onError("Error: <%= error.message %>")
    }))
//    .pipe(plugins.uglify())
//    .pipe(plugins.concat('lib.min.js'))
    .pipe(gulp.dest(config.js.dest+'components'));
});
