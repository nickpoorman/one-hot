/**
 * One hot encode vectors using a streaming implementation.
 */

var _ = require('lodash');
var stream = require('stream');
var inherits = require('util').inherits;
var isArray = require('util').isArray;
inherits(OneHot, stream.Readable);

module.exports = OneHot;

function OneHot(opts) {
  if (!(this instanceof OneHot)) return new OneHot(opts);
  if (!opts) opts = {};

  this.indexes = [];
  // each one hot index contains an array which will act as the one hot key
  this.indexesCategories = {};
  // keep tack of the columns (this will be created after indexesCategories is built)
  this.categoryColumns = [];

  return this;
}

OneHot.prototype.analyze = function(data, cb) {
  if (typeof data === 'function') {
    cb = data;
    data = undefined;
  }

  // when not using the stream externally, a callback must be provided
  if (typeof data !== 'undefined' && cb === 'undefined') throw new Error('data was supplied without a callback');

  var self = this;
  // create a stream that reads in the data and determines the indexes with value set
  var writable = new stream.Writable({
    write: function(chunk, encoding, next) {
      // sets this._write under the hood
      // each chunk is an input vector (array)
      _analyze.call(self, chunk, next);
    },
    objectMode: true
  });

  // if we wanted to make this super safe (keep a user from removing this finish)
  // we would need to return a stream that pipes to this one
  writable.on('finish', function() {
    // we need to build the final categories arrays and print out some stats
    // change them from an object to an array of the keys (we will need position)
    this.categoryColumns = _.keys(this.indexesCategories);
    if (typeof cb === 'function') return cb();
  });

  // if data was provided, ingest it
  if (data) return ingestData(writable, data);

  return writable;
}

OneHot.prototype.encode = function(data, cb) {
  if (typeof data === 'function') {
    cb = data;
    data = undefined;
  }

  var self = this;
  // sync the transformed data if called with data
  var sync = [];

  // create a stream that reads in the data and determines the indexes with value set
  var transform = new stream.Transform({
    transform: function(chunk, encoding, next) {
      // sets this._transform under the hood
    },
    flush: function(done) {
      // sets this._flush under the hood
    }
    objectMode: true
  });

  transform.on('finish', function(err) {
    if (err) return cb();
    // we need to build the final categories arrays and print out some stats
    // change them from being objects to being arrays (we will need position)
    this.categoryColumns = _.keys(this.indexesCategories);
    return cb();
  });

  // if data was provided, ingest it
  if (data) return ingestData(transform, data);

  return transform;
}

function _encode()

function _analyze(iv, cb) {
  // get the categorical indexes
  this.indexes = _.union(this.indexes, getCategoricalIndices(iv));
  var indexes = this.indexes;
  var indexesCategories = this.indexesCategories;
  // now get the categories
  var index;
  var category;
  var indexCategories;
  for (var i = indexes.length - 1; i >= 0; i--) {
    index = indexes[i];
    category = iv[index];
    if (typeof indexesCategories[index] === 'undefined') indexesCategories[index] = {};
    indexCategories = indexesCategories[index];
    if (typeof indexCategories[category] === 'undefined') indexCategories[category] = 0;
    indexCategories[category]++;
  };
}

/**
 * given an array return an array of indexes that are categorical indices
 */
function getCategoricalIndices(array) {
  var indexes = [];
  for (var i = 0; i < array.length; i++) {
    if (_.isNumber(array[i]) && _.isFinite(array[i])) continue;
    indexes.push(i);
  };
  return indexes;
}

function ingestData(writable, testIVs, index) {
  if (typeof index === 'undefined') index = 0;
  var ok;
  do {
    ok = writable.write(testIVs[index++]);
  } while (index < testIVs.length && ok);
  if (index >= testIVs.length) return writable.end();
  writable.once('drain', function() {
    ingestData(writable, testIVs, index);
  });
}

function analyzeStream() {

}

// we create a stream that wraps the one provided so the user doesn't accidentally remove needed internals
function wrapStream(stream) {
  var passThrough = new stream.PassThrough({
    objectMode: true
  });

  passThrough.pipe(stream);

  return passThrough;
}
