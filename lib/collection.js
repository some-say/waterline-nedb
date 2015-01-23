var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var Errors = require('waterline-errors').adapter;
var NeDB = require('nedb');
var Query = require('./query');

/**
 * Constructor for Collection
 */
var Collection = module.exports = function(options, schema, cb) {
  var self = this;

  this.options = options;
  this.schema = this._normalizeSchema(schema);

  var isNew = !fs.existsSync(options.filename);

  var db = new NeDB(options);
  db.loadDatabase(function(err) {
    if(err) return cb(err);

    self.db = db;

    // Ensure indexes here for any new databases
    if(isNew) {
      self.buildIndex(cb);
    }
    else {
      cb();
    }
  });
}

Collection.prototype._normalizeSchema = function(schema) {
  // Remove any Auto-Increment Keys, nedb currently doesn't handle this well without
  // creating additional collection for keeping track of the increment values
  _.each(_.keys(schema), function(key) {
    if(schema[key].autoIncrement) delete schema[key].autoIncrement;
  });
  return schema;
};

/**
 * Normalzie data before saving into database
 */
Collection.prototype._beforeSave = function(model) {
  delete model._id;
  if(model.id) {
    var id = model.id;
    if(typeof model.id !== 'string') {
      id = id + '';
    }
    model._id = id;
  }
  delete model.id;
  return model;
};

/**
 * Normalize data before sendng to the user
 */
Collection.prototype._beforeLoad = function(model) {
  model.id = model._id;
  delete model._id;
  return model;
};

/**
 * Build collection index
 */
Collection.prototype.buildIndex = function(cb) {
  var self = this;
  async.each(_.keys(_.omit(self.schema, 'id')), function(fieldName, cb) {
    switch(true) {
      case self.schema[fieldName].unique:
        self.db.ensureIndex({fieldName: fieldName, unique: true, sparse: true}, cb);
        break;
      case self.schema[fieldName].index:
        self.db.ensureIndex({fieldName: fieldName}, cb);
        break;
      default:
        cb();
    }
  }, function(err) {
    cb(err);
  });
};

/**
 * Drop db file
 */
Collection.prototype.drop = function(cb) {
	var self = this;
  try {
    fs.unlink(this.options.filename, function(err) {
    	if(err) return err;
    	if(fs.existsSync(self.options.filename)) {
    		cb(new Error('Cannot drop collection, datastore file is currently in use.'));
    	}
    	cb();
    });
  }
  catch(e) {
    cb(e)
  }
};

Collection.prototype.createEach = function(data, cb) {
	var self = this;
  if(!_.isArray(data)) {
  	data = [data];
  }
  _.each(data, function(item) {
  	self._beforeSave(item);
  });

  // Insert a new document into the collection
  this.db.insert(data, function(err, results) {
    if(err) return cb(err);
    _.each(results, function(item) {
    	self._beforeLoad(item);
    })
    cb(null, results);
  });
}

/**
 * Insert a record
 */
Collection.prototype.create = function(data, cb) {
	this.createEach(data, function(err, results) {
		if(err) return cb(err);
		cb(null, results[0]);
	});
};

/**
 * Count results
 */
Collection.prototype.count = function count(criteria, cb) {
  var self = this;
  var query;

  // Ignore `select` from waterline core
  if (typeof criteria === 'object') {
    delete criteria.select;
  }

  // Catch errors build query and return to the callback
  try {
    query = new Query(criteria, this.schema);
  } catch(err) {
    return cb(err);
  }

  this.db.count(query.criteria.where, function(err, count) {
    if (err) return cb(err);
    cb(null, count);
  });
};


/**
 * Find Documents
 *
 * @param {Object} criteria
 * @param {Function} callback
 * @api public
 */

Collection.prototype.find = function find(criteria, cb) {
	var self = this;
  var query;

  // Ignore `select` from waterline core
  if (typeof criteria === 'object') {
    delete criteria.select;
  }

  // Catch errors from building query and return to the callback
  try {
    query = new Query(criteria, this.schema);
  } catch(err) {
    return cb(err);
  }

  var where = query.criteria.where || {};
  var queryOptions = _.omit(query.criteria, 'where');

  // Run Normal Query on collection
  var cursor = this.db.find(where);
  _.each(queryOptions, function(value, key) {
  	cursor = cursor[key](value);
  });
  cursor.exec(function(err, results) {
    if(err) return cb(err);
    if(_.isArray(results)) {
    	_.each(results, function(result) {
    		self._beforeLoad(result);
    	});
    }
    else {
    	self._beforeLoad(results);
    }
    cb(null, results);
  });
};

/**
 * Update Documents
 *
 * @param {Object} criteria
 * @param {Object} values
 * @param {Function} callback
 * @api public
 */

Collection.prototype.update = function update(criteria, values, cb) {
  var self = this;
  var query;

  // Ignore `select` from waterline core
  if (typeof criteria === 'object') {
    delete criteria.select;
  }

  // Catch errors build query and return to the callback
  try {
    query = new Query(criteria, this.schema);
  } catch(err) {
    return cb(err);
  }

  // NeDB doesn't allow ID's to be updated
  delete values.id;
  delete values._id;

  // Add the ability to unset fields when schema = false
	var options = { $set: values };
	if(options['$set']['$unset']) {
		options['$unset'] = _.cloneDeep(options['$set']['$unset']);
		delete options['$set']['$unset'];
	}

  // Lookup records being updated and grab their ID's
  // Useful for later looking up the record after an insert
  // Required because options may not contain an ID
  self.db.update(query.criteria.where, options, { multi: true }, function(err, numUpdated) {
    if(err) return cb(err);
    cb(null, numUpdated);
  });

 	// This is simply wrong. See https://github.com/balderdashy/waterline/issues/805
  // this.db.find(query.criteria.where, {_id: 1}, function(err, records) {
  //   if(err) return cb(err);
  //   if(!records) return cb(Errors.NotFound);

  //   // Build an array of records
  //   var updatedRecords = [];

  //   records.forEach(function(record) {
  //     updatedRecords.push(record._id);
  //   });

  //   // Update the records
  //   self.db.update(query.criteria.where, { '$set': values }, { multi: true }, function(err, result) {
  //     if(err) return cb(err);

  //     // Look up newly inserted records to return the results of the update
  //     self.db.find({ _id: { '$in': updatedRecords }}, function(err, records) {
  //       if(err) return cb(err);
  //       _.each(records, function(record) {
  //       	self._beforeLoad(record);
  //       })
  //       cb(null, records);
  //     });
  //   });
  // });
};

/**
 * Destroy Documents
 *
 * @param {Object} criteria
 * @param {Function} callback
 * @api public
 */

Collection.prototype.destroy = function destroy(criteria, cb) {
  var self = this;
  var query;

  // Ignore `select` from waterline core
  if (typeof criteria === 'object') {
    delete criteria.select;
  }

  // Catch errors build query and return to the callback
  try {
    query = new Query(criteria, this.schema);
  } catch(err) {
    return cb(err);
  }

  this.db.remove(query.criteria.where, {multi: true}, function(err, numDeleted) {
    if(err) return cb(err);

    cb(null, numDeleted);
  });
};

/**
 * Get name of primary key field for this collection
 *
 * @return {String}
 * @api private
 */
Collection.prototype._getPK = function _getPK () {
  var self = this;
  var pk;

  _.keys(this.schema).forEach(function(key) {
    if(self.schema[key].primaryKey) pk = key;
  });

  if(!pk) pk = 'id';
  return pk;
};