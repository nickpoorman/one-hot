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

  this.oneCold = opts.oneCold;

  this.hotValue = 1;
  this.coldValue = 0;
  if (this.oneCold) {
    this.hotValue = 0;
    this.coldValue = 1;
  }

  // keeps track of the number of (expanded) features
  this.numberOfFeatures = 0;
  this.originalIVLength = 0;
  this.indexes = [];
  // each one hot index contains an array which will act as the one hot key
  // when we get a category, map it's current index to a new index, ie:
  // {
  //   '1': {
  //     'cat': 9,
  //     'dog': 10
  //   },
  //   '2': {
  //     'foo': 11,
  //     'bar': 12
  //   }
  // }
  this.indexesFeatures = {};
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
    if (typeof cb === 'function') return cb();
  });

  // if data was provided, ingest it
  if (typeof data !== 'undefined') return ingestData(writable, data);

  return writable;
}

OneHot.prototype.encode = function(data, cb) {
  if (typeof data === 'function') {
    cb = data;
    data = undefined;
  }

  var self = this;
  var collect = [];

  // create a stream that reads in the data and determines the indexes with value set
  var transform = new stream.Transform({
    transform: function(chunk, encoding, next) {
      var that = this;
      // sets this._transform under the hood
      return _encode.call(self, chunk, next);
    },
    flush: function(done) {
      // sets this._flush under the hood
      // we don't need to do anything with this...
      return done();
    },
    objectMode: true
  });

  transform.on('end', function(err) {
    if (typeof cb === 'function') {
      if (err) return cb(err);
      return cb(null, collect);
    }
  });

  // if data was provided, ingest it
  if (typeof data !== 'undefined') {
    ingestData(transform, data);
    if (typeof cb === 'function') {
      // if data was provided we want to collect it to an array
      // need to create a read stream
      transform.on('data', function(chunk) {
        collect.push(chunk);
      });
    }
  }

  return transform;
}

OneHot.prototype.getEncodedColumnIndex = function(originalIndex, feature) {
  // given the original index in the input vector and the feature value, return the one hot encoded index for that value
  // or undefined if that feature was not found
  var featureValues = this.indexesFeatures[originalIndex];
  if (typeof featureValues === 'undefined') return;
  var encodedIndex = featureValues[feature];
  if (typeof encodedIndex === 'undefined') return;
  return encodedIndex - this.indexes.length;
}

function _encode(iv, cb) {
  var encodedIV = _.clone(iv, true);
  // init the new features
  for (var i = this.originalIVLength; i < this.numberOfFeatures; i++) {
    encodedIV.push(this.coldValue);
  };
  var indexes = this.indexes;
  var indexesFeatures = this.indexesFeatures;

  // encode each index one by one
  var originalIVIndex;
  var featureValue;
  var indexFeatures;
  var encodedIVIndex;
  for (var i = indexes.length - 1; i >= 0; i--) {
    originalIVIndex = indexes[i];
    featureValue = iv[originalIVIndex];
    if (typeof featureValue === 'undefined') continue; // value will remain zero
    indexFeatures = indexesFeatures[originalIVIndex];
    if (typeof indexFeatures === 'undefined') return cb(new Error('unknown features at index: ' + i));
    encodedIVIndex = indexFeatures[featureValue];
    if (typeof indexFeatures === 'undefined') return cb(new Error('unknown features value at index: ' + i));
    // now that we have the index where this value is hot we need to turn it on
    encodedIV[encodedIVIndex] = this.hotValue;
  };

  // before data goes out we need to remove all the indexes that we expanded
  // we'll do this by only keeping the indexes we want
  var finalEncodedIV = [];
  for (var i = 0; i < encodedIV.length; i++) {
    if (typeof indexesFeatures[i] !== 'undefined') continue;
    finalEncodedIV.push(encodedIV[i]);
  };

  return cb(null, finalEncodedIV);
}


function _analyze(iv, cb) {
  if (this.numberOfFeatures === 0 && iv.length !== 0) {
    this.numberOfFeatures = iv.length;
    this.originalIVLength = iv.length;
  }
  // get the categorical indexes
  this.indexes = _.union(this.indexes, getCategoricalIndices(iv));
  var indexes = this.indexes;
  var indexesFeatures = this.indexesFeatures;
  // now get the features at each index
  var originalIVIndex;
  var featureValue;
  var indexFeatures;
  for (var i = indexes.length - 1; i >= 0; i--) {
    originalIVIndex = indexes[i];
    featureValue = iv[originalIVIndex];
    if (typeof indexesFeatures[originalIVIndex] === 'undefined') indexesFeatures[originalIVIndex] = {};
    indexFeatures = indexesFeatures[originalIVIndex];
    if (typeof indexFeatures[featureValue] === 'undefined') {
      indexFeatures[featureValue] = this.numberOfFeatures;
      this.numberOfFeatures++;
    }
  };
  return cb()
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
