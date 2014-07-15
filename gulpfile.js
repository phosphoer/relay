(function()
{
  'use strict';

  var gulp = require('gulp');
  var concat = require('gulp-concat');
  var zip = require('gulp-zip');
  var rimraf = require('gulp-rimraf');

  var modules = ['github', 'imgur', 'irc', 'underscore', 'moment'];

  // Main build task
  gulp.task('default', function()
  {
    gulp.src('bin/app/package.nw')
    .pipe(rimraf());

    gulp.src('src/*.*')
    .pipe(gulp.dest('bin/'))
    .pipe(gulp.dest('bin/package'));

    gulp.src('package.json')
    .pipe(gulp.dest('bin/'))
    .pipe(gulp.dest('bin/package'));

    for (var i = 0; i < modules.length; ++i)
    {
      gulp.src('node_modules/' + modules[i] + '/**/*')
      .pipe(gulp.dest('bin/package/node_modules/' + modules[i]));
    }

    setTimeout(function()
    {
    gulp.src('bin/package/**/*')
    .pipe(zip('package.nw'))
    .pipe(gulp.dest('bin/app'));
    }, 500);
  });

})();