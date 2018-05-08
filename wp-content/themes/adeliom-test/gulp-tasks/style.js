// Requis
var gulp = require('gulp');
var config = require('../config.json');
var plugins = require('gulp-load-plugins')(); // tous les plugins de package.json


gulp.task('css', function(){
  return gulp.src( config.sass.source+ 'style.scss')
    .pipe(plugins.plumber({
        errorHandler:
           plugins.notify.onError("Error: <%= error.message %>")
    }))
    .pipe(plugins.sass())
    .pipe(plugins.csscomb())
    .pipe(plugins.cssbeautify({indent: '  '}))
    .pipe(plugins.autoprefixer())
    .pipe(plugins.notify({
            title: 'Gulp',
            subtitle: 'success',
            message: 'Gulp task CSS complete !'
        }))
    .pipe(gulp.dest(config.sass.dest))
});


// Tâche "minify" = minification CSS (dest -> dest)
gulp.task('minify', function () {
  return gulp.src(['./'+config.sass.dest + '*.css', '!' + './' + config.sass.dest + '*.min.css'])
    .pipe(plugins.csso())
  //  .pipe(plugins.uncss())
    .pipe(plugins.rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('./'+ config.sass.dest));
});
