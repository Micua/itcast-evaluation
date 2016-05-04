/*
 * @Author: iceStone
 * @Date:   2015-08-31 11:40:15
 * @Last Modified by:   iceStone
 * @Last Modified time: 2015-12-30 22:10:58
 */
'use strict';

const spawn = require('child_process').spawn;

const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const del = require('del');
const asar = require('asar');
const electron = require('electron-prebuilt')

const plugins = gulpLoadPlugins();

const buildTemp = '.tmp';

gulp.task('clean', del.bind(null, [
  buildTemp,
  'build/cache',
  'build/core.asar',
  'build/data.asar',
  'build/itcast-tms.log',
  'build/updater.asar',
  'cache',
  'dist/packages',
  'itcast-log',
  'src/renderer/css',
  'core.asar',
  'data.asar',
  'itcast-tms.log',
  'updater.asar',
  'npm-debug.log'
]));

gulp.task('less', () => {
  return gulp.src(['src/renderer/less/*.less', '!src/renderer/less/_*.less'])
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.less())
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('src/renderer/css'))
    .pipe(plugins.livereload());
    // .pipe(server.reload());
});

gulp.task('useref', ['less'], () => {
  const iff = (file) => {
    console.log(file.path);
    return false;
  };
  return gulp.src('src/renderer/*.html')
    .pipe(plugins.useref())
    .pipe(plugins.if('**/vendor.js', plugins.uglify()))
    .pipe(plugins.if('*.css', plugins.cssnano()))
    .pipe(gulp.dest(buildTemp + '/renderer'));
});

gulp.task('html', ['useref'], () => {
  return gulp.src(buildTemp + '/renderer/*.html')
    .pipe(plugins.htmlmin({
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      minifyCSS: true,
      minifyJS: true,
    }))
    .pipe(gulp.dest(buildTemp + '/renderer'));
});

gulp.task('extras', () => {
  return gulp.src([
    'src/**/*.*',
    '!src/renderer/js/**/*.*',
    '!src/renderer/less/**/*.*',
    '!src/renderer/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest(buildTemp));
});

gulp.task('size', ['html', 'extras'], () => {
  return gulp.src(buildTemp + '/**/*.*')
    .pipe(plugins.size({
      title: 'build',
      gzip: true
    }))
    .pipe(gulp.dest(buildTemp));
});

const asarPack = (src, dest) => new Promise((resolve, reject) => {
  asar.createPackage(src, dest, resolve);
});

gulp.task('build', ['size'], () => {
  Promise.all([
    asarPack(buildTemp, './build/core.asar'),
    asarPack('data', './build/data.asar'),
    asarPack('updater', './build/updater.asar')
  ]).then(() => {
    const corePkg = require(`./${buildTemp}/package.json`);
    gulp.src('./build/core.asar')
      .pipe(plugins.rename('core'))
      .pipe(plugins.zip(`core-${corePkg.version}.zip`))
      .pipe(gulp.dest('./dist/packages'));
    const dataPkg = require('./data/package.json');
    gulp.src('./build/data.asar')
      .pipe(plugins.rename('data'))
      .pipe(plugins.zip(`data-${dataPkg.version}.zip`))
      .pipe(gulp.dest('./dist/packages'));
    const updaterPkg = require('./updater/package.json');
    gulp.src('./build/updater.asar')
      .pipe(plugins.rename('updater'))
      .pipe(plugins.zip(`updater-${updaterPkg.version}.zip`))
      .pipe(gulp.dest('./dist/packages'));

    // copy entry portal
    // gulp.src(['./index.js', './package.json'])
    //   .pipe(gulp.dest('./build'))

    del(buildTemp);
  });
});

gulp.task('default', ['clean'], () => {
  gulp.start('build');
});



gulp.task('watch', ['less'], () => {
  plugins.livereload.listen( /* { basePath: 'src' } */ );

  gulp.watch([
    'src/renderer/**/*.html',
    'src/renderer/**/*.js'
  ]).on('change', e => {
    plugins.livereload.changed(e.path);
  });

  gulp.watch('src/renderer/less/**/*.less', ['less']);
});

gulp.task('test', ['watch'], () => {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  spawn(electron, ['.']);
});
