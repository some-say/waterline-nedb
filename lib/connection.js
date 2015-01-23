var Collection = require('./collection');
var fs = require('fs');
var path = require('path');
var util = require('util');
var async = require('async');
var _ = require('lodash');

function getDbFilename(dbPath, modelName) {
  return path.join(dbPath, modelName + '.nedb');
}

var Connection = module.exports = function(config, models, cb) {
  var self = this;

  this.config = config;
  this.collections = {};

  // Load all collections(models)
  async.each(_.keys(models), function(modelName, cb) {
    var options = _.cloneDeep(config);

    options.filename = getDbFilename(config.dbPath, modelName);
    delete options.dbPath;

    self.collections[modelName] = new Collection(options, models[modelName].definition, cb);

  }, function(err) {
    if(err) return cb(_.extend({}, new Error(util.format('Failed to connect to NeDB. Are you sure dbPath is properly configured in config/connections.js?\n Error details:\n%s', util.inspect(err, false, null))), {originalError: err}));
    cb();
  });
}
