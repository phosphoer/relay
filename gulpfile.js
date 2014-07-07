(function()
{
  "use strict";

  var gulp = require("gulp");
  var concat = require("gulp-concat");
  var zip = require("gulp-zip");

  var appFiles =
  [
    "package.json",
    "index.html",
    "app.js",
    "ractive.js",
    "style.css"
  ];

  // Main build task
  gulp.task("default", function()
  {
    gulp.src("src/*.js")
    .pipe(concat("app.js"))
    .pipe(gulp.dest("./"));

    gulp.src(appFiles)
    .pipe(gulp.dest("app/"));
  });

  gulp.task("release", ["default"], function()
  {
    gulp.src(appFiles)
    .pipe(zip("package.nw"))
    .pipe(gulp.dest("app/"));
  });

  // Rerun the task when a file changes
  gulp.task("watch", function()
  {
    gulp.watch(["src/*.js", "index.html", "package.json", "style.css"], ["default"]);
  });

})();