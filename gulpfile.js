(function()
{
  "use strict";

  var gulp = require("gulp");
  var concat = require("gulp-concat");
  var zip = require("gulp-zip");
  var rimraf = require('gulp-rimraf');

  var appFiles =
  [
    "package.json",
    "index.html",
    "ractive.js",
    "style.css"
  ];

  var packageFiles =
  [
    "app/package.json",
    "app/index.html",
    "app/ractive.js",
    "app/app.js",
    "app/style.css"
  ];

  // Main build task
  gulp.task("default", function()
  {
    gulp.src("src/*.js")
    .pipe(concat("app.js"))
    .pipe(gulp.dest("app/"));

    gulp.src(appFiles)
    .pipe(gulp.dest("app/"));
  });

  gulp.task('clean', function()
  {
    var cleanFiles = packageFiles.slice();
    gulp.src(packageFiles)
    .pipe(rimraf());
  });

  gulp.task("release", ["default"], function()
  {
    gulp.src(packageFiles)
    .pipe(gulp.dest("app/package/"));

    gulp.src("./node_modules/irc/**/*")
    .pipe(gulp.dest("app/package/node_modules/irc/"));

    gulp.src("app/package/**/*")
    .pipe(zip("package.nw"))
    .pipe(gulp.dest("app/"));
  });

  // Rerun the task when a file changes
  gulp.task("watch", function()
  {
    gulp.watch(["src/*.js", "index.html", "package.json", "style.css"], ["default"]);
  });

})();