require('source-map-support').install();

var gulp = require('gulp');
var mjs = require('gulp-mjs');
var mocha = require('gulp-mocha');
var es = require('event-stream');
var path = require('path');
var Stream = require('stream').Stream;

var paths = {
    src: ['macros.mjs'],
    dest: '.',
    test: {
      src: ['test/*.mjs'],
      dest: 'test'
    }
};

function macros() {
  return combine(
    gulp.src(paths.src),
    mjs({debug: true}),
    gulp.dest(paths.dest));
}

function combine() {
  return es.pipeline.apply(null, arguments);
}

var javascriptFiles = es.map(function (data, callback) {
  if (isJavascriptFile(data))
    callback(null, data);
  else
    callback();
});

function test() {
  return combine(
    gulp.src(paths.test.src),
    mjs({debug: true}).on('error', onError),
    gulp.dest(paths.test.dest),
    javascriptFiles,
    mocha({reporter: 'spec'}));
}

function isJavascriptFile(f) {
  return f.path && path.extname(f.path) == '.js';
}

gulp.task('test-without-errors', function() {
  var errors = 0;
  var stream = new Stream();
  var end = function() { stream.emit('end'); };
  macros()
    .on('error', function(err) {
      onError(err);
      errors++;
      return end();
    })
    .on('end', function() {
      if (errors > 0) {
        console.warn('compilation failed (' + errors + ' errors).');
        return end();
      }
      return test()
        .on('error', onError)
        .on('end', end);
    });
  return stream;
});

function onError(err) {
  console.warn(err.stack || err.message || err.toString());
}

gulp.task('benchmark', ['macros'], function () {
  return combine(
    gulp.src('benchmarks.mjs'),
    mjs({debug: true}),
    gulp.dest('.'),
    javascriptFiles,
    es.map(function (file) {
      require(file.path);
    }));
});

// Rerun the tests whenever a test or src file changes
gulp.task('autotest', ['test-without-errors'], function () {
  gulp.watch([paths.src, paths.test.src], ['test-without-errors']);
});

gulp.task('test', ['macros'], test);

gulp.task('macros', macros);

gulp.task('default', ['test']);
