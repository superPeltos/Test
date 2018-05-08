// Requis
var gulp = require('gulp');
var config = require('../config.json');
var plugins = require('gulp-load-plugins')(); // tous les plugins de package.json

// Tâche "js-bootstrap" = uglify + concat
gulp.task('js-bootstrap', function() {
  return gulp.src( config.js.source+ 'bootstrap/*.js')
    .pipe(plugins.uglify())
    .pipe(plugins.concat('bootstrap.min.js'))
    .pipe(gulp.dest( config.js.dest));
});
