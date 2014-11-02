// now it is possible to use multiple view-data-sets for one template. 
// if more than one object with the path "template-name.jade" is found 
// in "serverTemplate.views", the second view compiles to "template-name-2.html"
//
// exports.config = {
//   "modules": [
//     "copy",
//     "server",
//     "jshint",
//     "server-template-compile",
//     "csslint",
//     "require",
//     "minify-js",
//     "minify-css",
//     "live-reload",
//     "bower",
//     "sass",
//     "handlebars"
//   ],
//   "serverTemplate": {
//     "locals": {
//         "title": "General Title here",
//         "tplOptions": {
//           "title": "Title for static pages"
//         }
//     },
//     views: [{
//       "path": "index.jade",
//       "locals": {
//       "title": "Local view title here",
//         "tplOptions": {
//           "title": "Title for static Views"
//         }
//       }
//     }, {
//       "path": "index.jade",
//       "locals": {
//         "tplOptions": {
//           "title": "Title for static Views 2"
//         }
//       }
//     }, {
//       "path": "index.jade",
//       "locals": {
//         "tplOptions": {
//           "title": "Title for static Views 3"
//         }
//       }
//     }]
//   }
// }

"use strict";
var config, cons, fs, logger, path, pretty, registration, wrench, _, __genCompileFiles, __genOutFileName, __getLocals, __writeOutputFile, _clean, _compileTemplates;

path = require("path");

fs = require("fs");

wrench = require("wrench");

cons = require('consolidate');

_ = require("lodash");

pretty = require("html").prettyPrint;

config = require('./config');

logger = null;

registration = function(mimosaConfig, register) {
  logger = mimosaConfig.log;
  if (mimosaConfig.isBuild) {
    register(['postBuild'], 'beforePackage', _compileTemplates);
  }
  return register(['preClean'], 'init', _clean);
};

_compileTemplates = function(mimosaConfig, options, next) {
  var compileFiles, done, i, st;
  st = mimosaConfig.serverTemplate;
  compileFiles = __genCompileFiles(st);
  if (!((compileFiles != null ? compileFiles.length : void 0) > 0)) {
    return next();
  }
  i = 0;
  done = function() {
    if (++i === compileFiles.length) {
      return next();
    }
  };
  return compileFiles.forEach(function(f) {
    var locals;
    locals = __getLocals(st, f);
    logger.debug("server-template-compile compiling [[ " + f + " ]]");
    return locals.forEach(function (local, index) {
      return cons[st.compileWith](f, local, function(err, html) {
        if (err) {
          logger.error("Compilation failed on file [[ " + f + " ]]:\n" + err);
          return done();
        } else {
          if (!(mimosaConfig.isMinify || mimosaConfig.isOptimize)) {
            html = pretty(html);
          }
          return __writeOutputFile(st, f, html, done, index);
        }
      });
    });
  });
};

_clean = function(mimosaConfig, options, next) {
  var compileFiles, compiledFiles, done, i, st, _ref;
  st = mimosaConfig.serverTemplate;
  compileFiles = __genCompileFiles(st);
  compiledFiles = (function () {
    return compileFiles
      .map(function (f) {
        var viewsCount, i, numberedFiles;
        viewsCount = __getLocals(st, f).length;
        numberedFiles = [];
        for (i = 0; i < viewsCount; i++) {
          numberedFiles.push(__genOutFileName(st.outPath, st.inPath, f, i));
        }
        return numberedFiles;
      })
      .reduce(function (a, b) {
        return a.concat(b);
      });
  }());
  if (!((compileFiles != null ? compileFiles.length : void 0) > 0)) {
    return next();
  }
  i = 0;
  done = function() {
    if (++i === compileFiles.length) {
      return next();
    }
  };
  return compiledFiles.forEach(function(f) {
    var outFileName = f;
    return fs.exists(outFileName, function(exists) {
      if (exists) {
        return fs.unlink(outFileName, function() {
          logger.success("Deleted compiled template [[ " + outFileName + " ]]");
          return done();
        });
      } else {
        return done();
      }
    });
  });
};

__getLocals = function(st, f) {
  var locals, locs, v;
  locals = (function() {
    var _i, _len, _ref;
    if (st.views != null) {
      locs = [];
      _ref = st.views;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        v = _ref[_i];
        if (v.path === f && (v.locals != null)) {
          locs.push(_.clone(v.locals, true));
        }
      }
      return locs.length ? locs : [st.locals];
    } else {
      return [st.locals];
    }
  })();
  return locals;
};

__writeOutputFile = function(st, f, html, cb, version) {
  var dirname, outFileName;
  outFileName = __genOutFileName(st.outPath, st.inPath, f, version);
  dirname = path.dirname(outFileName);
  return fs.exists(dirname, function(exists) {
    if (!exists) {
      logger.debug("server-template-compile making directory [[ " + dirname + " ]]");
      wrench.mkdirSyncRecursive(dirname, 0x1ff);
    }
    return fs.writeFile(outFileName, html, "utf8", function(err) {
      if (err) {
        logger.error("Error writing [[ " + outFileName + " ]]");
      } else {
        logger.success("server-template-compile wrote file [[ " + outFileName + " ]]");
      }
      return cb();
    });
  });
};

__genCompileFiles = function(config) {
  var allFiles, compileFiles;
  allFiles = wrench.readdirSyncRecursive(config.inPath).map(function(f) {
    return path.join(config.inPath, f);
  });
  compileFiles = allFiles.filter(function(f) {
    return config.exclude.indexOf(f) === -1;
  });
  return compileFiles = compileFiles.filter(function(f) {
    return path.extname(f) === ("." + config.extension);
  });
};

__genOutFileName = function(outPath, inPath, f, version) {
  var outFileName;
  outFileName = path.join(outPath, f.replace(inPath, ""));
  if (version) {
    return outFileName.replace(path.extname(outFileName), ("-" + version + ".html"));
  }
  return outFileName.replace(path.extname(outFileName), ".html");
};

module.exports = {
  registration: registration,
  defaults: config.defaults,
  placeholder: config.placeholder,
  validate: config.validate
};
