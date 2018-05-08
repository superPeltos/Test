// Requis
var gulp = require('gulp');
var config = require('../config.json');
var plugins = require('gulp-load-plugins')(); // tous les plugins de package.json

var path = require('path');
var runTimestamp = Math.round(Date.now()/1000);
var fontName= 'iconfont';

gulp.task('iconfont', function(){
  return gulp.src([ config.icons.source + 'svg/*.svg'])
    .pipe(plugins.iconfontCss({
       fontName: fontName,
       path:  config.icons.source + 'icons-template.scss',
       targetPath: '../../../dev/sass/_icons.scss',
       fontPath: '../fonts/icons-font/'
     }))
    .pipe(plugins.iconfont({
      fontName: fontName, // required
      prependUnicode: true, // recommended option
      formats: ['ttf', 'eot', 'woff', 'svg', 'woff2'], // default, 'woff2' and 'svg' are available
      timestamp: runTimestamp, // recommended to get consistent builds when watching files
    }))
      .on('glyphs', function(glyphs, options) {
        // CSS templating, e.g.
        console.log(glyphs, options);

      })
    .pipe(gulp.dest(  config.fonts.dest + 'icons-font'));
});
