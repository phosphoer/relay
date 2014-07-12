(function()
{
  'use strict';

  var gulp = require('gulp');
  var concat = require('gulp-concat');
  var zip = require('gulp-zip');
  var rimraf = require('gulp-rimraf');

  var appFiles =
  [
    'package.json',
    'index.html',
    'ractive.js',
    'style.css'
  ];

  var packageFiles =
  [
    'app/package.json',
    'app/index.html',
    'app/ractive.js',
    'app/app.js',
    'app/channel.js',
    'app/user.js',
    'app/events.js',
    'app/commands.js',
    'app/log.js',
    'app/main.js',
    'app/style.css'
  ];

  // Main build task
  gulp.task('default', function(cb)
  {
    gulp.src('src/*.js')
    .pipe(gulp.dest('app/'));

    gulp.src(appFiles)
    .pipe(gulp.dest('app/'));

    setTimeout(function() {cb();}, 100);
  });

  gulp.task('clean', function(cb)
  {
    var cleanFiles = packageFiles.slice();
    gulp.src(packageFiles)
    .pipe(rimraf());

    setTimeout(function() {cb();}, 100);
  });

  gulp.task('package', function(cb)
  {
    gulp.src(packageFiles)
    .pipe(gulp.dest('app/package/'));

    gulp.src('./node_modules/irc/**/*')
    .pipe(gulp.dest('app/package/node_modules/irc/'));

    gulp.src('./node_modules/underscore/**/*')
    .pipe(gulp.dest('app/package/node_modules/underscore/'));

    gulp.src('./node_modules/imgur/**/*')
    .pipe(gulp.dest('app/package/node_modules/imgur/'));

    setTimeout(function() {cb();}, 100);
  });

  gulp.task('release', ['default', 'package'], function(cb)
  {
    gulp.src('app/package/**/*')
    .pipe(zip('package.nw'))
    .pipe(gulp.dest('app/relay/'));

    setTimeout(function() {cb();}, 100);
  });

  // Rerun the task when a file changes
  gulp.task('watch', function()
  {
    gulp.watch(['src/*.js', 'index.html', 'package.json', 'style.css'], ['default']);
  });

})();