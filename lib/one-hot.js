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

  return this;
}

OneHot.prototype.analyze = function(data, cb) {
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

  // add ingest method, where we pass data as the first param
  if (typeof data !== 'function') {
    writable.on('finish', _analyzeFinish.bind(this));
    ingestData(writable, data);
    return;
  }

  cb = data;
  writable.on('finish', _analyzeFinish.bind(this));
  return writable;
}

function _analyzeFinish(cb) {
  // we need to build the final categories arrays and print out some stats
  // TODO: ...
}

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

var oneHot = new OneHot();
var wr = oneHot.analyze(function(err) {
  if (err) throw err;
  console.log('done.');
});

var testIVs = [
  [0, 1, 2, 'a'],
  [3, 4, 5, 'b'],
  [6, 7, 8, 'c']
];

function ingestData(writable, testIVs, index) {
  if (typeof index === 'undefined') index = 0;
  var ok;
  do {
    ok = writable.write(testIVs[index++]);
  } while (index < testIVs.length && ok);
  if (index >= testIVs.length) return writable.end();
  writable.once('drain', function() {
    ingestData(testIVs, index);
  });
}

ingestData(wr, testIVs);

console.log('done.');
