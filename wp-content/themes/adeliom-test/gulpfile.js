// Requis
var gulp = require('gulp');
var config = require('./config.json');
var requireDir = require('require-dir');


requireDir( './gulp-tasks', { recurse: true } );

gulp.task('notif', function(){
  console.log('------------------ Start -------------------');
});
// Tâche "watch" = je surveille *less
gulp.task('watch', function(){
  gulp.watch(config.sass.source + '**/*.scss', ['notif', 'css']);
  gulp.watch(config.js.source + '*.js', ['js']);
  gulp.watch(config.js.source + 'lib/*.js', ['js-lib']);
  gulp.watch(config.js.source + 'components/*.js', ['js-components']);

});
