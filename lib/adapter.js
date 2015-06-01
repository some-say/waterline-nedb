/*---------------------------------------------------------------
  :: waterline-nedb
  -> adapter
---------------------------------------------------------------*/

var Connection = require('./connection');
var Errors = require('waterline-errors').adapter;
var _runJoins = require('waterline-cursor');
var fs = require('fs');
var path = require('path');
var util = require('util');
var async = require('async');
var _ = require('lodash');

module.exports = (function() {

  // Keep track of all the connections used by the app
  var connections = {};

  var adapter = {
    identity: 'waterline-nedb',

    // Which type of primary key is used by default
    pkFormat: 'string',

    // to track schema internally
    syncable: true,

    // Expose all the connection options with default settings
    defaults: {

      // Connection Configuration

      // default to memory based;
      dbPath: undefined,
      inMemoryOnly: false,
      autoload: false
      // afterSerialization: undefined,
      // beforeDeserialization: undefined,
      //corruptAlertThreshold: 0.1
    },

    /**
     * Register A Connection
     *
     * Will open up a new connection using the configuration provided and store the DB
     * object to run commands off of. This creates a new pool for each connection config.
     *
     * @param {Object} config Database configurations
     * @param {Object} collections All collections in ORM modules
     * @param {Function} callback
     */

    registerConnection: function(config, models, cb) {
      if(!config.identity) return cb(Errors.IdentityMissing);
      if(connections[config.identity]) return cb(Errors.IdentityDuplicate);
      if(!fs.existsSync(config.dbPath)) return cb(new Error(util.format('`dbPath` "%s" does not exist!', config.dbPath)));
      if(!fs.statSync(config.dbPath).isDirectory()) return cb(new Error(util.format('`dbPath` "%s" should be an empty directory!', config.dbPath)));

      // Store the connection
      connections[config.identity] = new Connection(config, models, cb);
    },

    /**
     * Teardown
     *
     * Closes the connection pool and removes the connection object from the registry.
     *
     * @param {string} connectionName
     * @param {Function} cb
     */

    teardown: function (connection, cb) {
      if (typeof connection == 'function') {
        cb = connection;
        connection = null;
      }
      if (connection == null) {
        connections = {};
        return cb();
      }
      if(!connections[connection]) return cb();
      delete connections[connection];
      cb();
    },

    /**
     * Describe
     *
     * Return the Schema of a collection after first creating the collection
     * and indexes if they don't exist.
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Function} callback
     */

    describe: function(connectionName, collectionName, cb) {
      var collection = connections[connectionName].collections[collectionName];

      cb(null, collection.schema);
    },

    alter: function(collectionName, changes, cb) {
      var collection = connections[connectionName].collections[collectionName];

      // Create the collection indexes
      collection.buildIndex(cb);
    },

    /**
     * Define
     *
     * Create a new NeDB Collection and set Index Values
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} definition
     * @param {Function} callback
     */

    define: function(connectionName, collectionName, definition, cb) {
      var collection = connections[connectionName].collections[collectionName];

      // Create the collection indexes
      collection.buildIndex(cb);
    },

    /**
     * Drop
     *
     * Drop a Collection
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Array} relations
     * @param {Function} callback
     */

    drop: function(connectionName, collectionName, relations, cb) {
      if(typeof relations === 'function') {
        cb = relations;
        relations = [];
      }
      var collection = connections[connectionName].collections[collectionName];

      collection.drop(cb);
    },

    /**
     * Native
     *
     * Give access to a native nedb collection object for running custom
     * queries.
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Function} callback
     */

    native: function(connectionName, collectionName, cb) {
      cb(null, connections[connectionName].collections[collectionName].db);
    },

    /**
     * Create
     *
     * Insert a single document into a collection.
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} data
     * @param {Function} callback
     */

    create: function(connectionName, collectionName, data, cb) {
      var collection = connections[connectionName].collections[collectionName];
      collection.create(data, cb);
    },

    /**
     * Create Each
     *
     * Insert an array of documents into a collection.
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} data
     * @param {Function} callback
     */

    createEach: function(connectionName, collectionName, data, cb) {
      var collection = connections[connectionName].collections[collectionName];
      collection.createEach(data, cb);
    },

    /**
     * Find
     *
     * Find all matching documents in a colletion.
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} options
     * @param {Function} callback
     */

    find: function(connectionName, collectionName, options, cb) {
      var collection = connections[connectionName].collections[collectionName];

      // Find all matching documents
      collection.find(options, cb);
    },

    /**
     * Update
     *
     * Update all documents matching a criteria object in a collection.
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} options
     * @param {Object} values
     * @param {Function} callback
     */

    update: function(connectionName, collectionName, options, values, cb) {
      var collection = connections[connectionName].collections[collectionName];

      // Update matching documents
      collection.update(options, values, cb);
    },

    /**
     * Destroy
     *
     * Destroy all documents matching a criteria object in a collection.
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} options
     * @param {Function} callback
     */

    destroy: function(connectionName, collectionName, options, cb) {
      var collection = connections[connectionName].collections[collectionName];

      // delete records
      collection.destroy(options, cb);
    },

    /**
     * Count
     *
     * Return a count of the number of records matching a criteria.
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} options
     * @param {Function} callback
     */

    count: function(connectionName, collectionName, options, cb) {
      var collection = connections[connectionName].collections[collectionName];

      // Find matching documents and return the count
      collection.count(options, cb);
    },


    /**
     * Join
     *
     * Peforms a join between 2-3 nedb collections when Waterline core
     * needs to satisfy a `.populate()`.
     *
     * @param  {[type]}   connectionName [description]
     * @param  {[type]}   collectionName [description]
     * @param  {[type]}   criteria       [description]
     * @param  {Function} cb             [description]
     * @return {[type]}                  [description]
     */
    join: function (connectionName, collectionName, criteria, cb) {

      // Ignore `select` from waterline core
      if (typeof criteria === 'object') {
        delete criteria.select;
      }

      var collection = connections[connectionName].collections[collectionName];

      // Populate associated records for each parent result
      // (or do them all at once as an optimization, if possible)
      _runJoins({

        instructions: criteria,
        parentCollection: collectionName,

        /**
         * Find some records directly (using only this adapter)
         * from the specified collection.
         *
         * @param  {String}   collectionIdentity
         * @param  {Object}   criteria
         * @param  {Function} cb
         */
        $find: function (collectionIdentity, criteria, cb) {
          var collection = connections[connectionName].collections[collectionIdentity];
          return collection.find(criteria, cb);
        },

        /**
         * Look up the name of the primary key field
         * for the collection with the specified identity.
         *
         * @param  {String}   collectionIdentity
         * @return {String}
         */
        $getPK: function (collectionIdentity) {
          if (!collectionIdentity) return;
          var collection = connections[connectionName].collections[collectionIdentity];
          return collection._getPK();
        }
      }, cb);

    }
  
  };

  return adapter;
})();
