/**
 * One hot encode vectors using a streaming implementation.
 */

var _ = require('lodash');
var stream = require('stream');
var isArray = require('util').isArray;

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

  // keeps track of the number of (expanded) features, including the index of each expanded feature
  this.numberOfInternalFeatures = 0;
  this.numberOfOriginalFeatures = 0;
  this.indexes = [];

  // this gets built with analyze()
  // each one hot index contains an object which will act as the one hot key
  // when we get a new one hot feature, map it's current index to a new index, ie:
  // levels go:
  //    original index
  //      feature value
  //            internal index
  // {
  //   '1': {
  //     'cat': 3,
  //     'dog': 5
  //   },
  //   '2': {
  //     'foo': 4,
  //     'bar': 6
  //   }
  // }
  this.indexesFeatures = {};

  // this gets built with analyze()
  // internalIndexToOriginalIndex looks like
  // {
  //   '3': 1,
  //   '4': 2,
  //   '5': 1,
  //   '6': 2
  // }
  this.internalIndexToOriginalIndex = {};

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
    // we have one too many number of features so remove one
    this.numberOfInternalFeatures--;

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

/**
 * Given the encoded index, return the column key in the form originalColumn:featureValue
 */
// TODO: fix this
OneHot.prototype.getEncodedColumnKey = function(encodedIndex) {
    index = getOriginalIndex.call(this, encodedIndex);
    // given the encoded index return the column key in the form originalColumn:featureValue
    var originalColumnAndFeatureValue = this.getOriginalColumnAndFeatureValue(index);
    if (typeof originalColumnAndFeatureValue === 'undefined') return;
    return columnKeyToString(originalColumnAndFeatureValue.originalIndex, originalColumnAndFeatureValue.featureValue);
  }
  // TODO: fix this
OneHot.prototype.getOriginalColumnAndFeatureValue = function(index) {
  var featureValues;
  var encodedIndex;
  for (var originalIndex in this.indexesFeatures) {
    featureValues = this.indexesFeatures[originalIndex];
    for (var featureValue in featureValues) {
      encodedIndex = featureValues[featureValue];
      if (encodedIndex === index) {
        return {
          originalIndex: originalIndex,
          featureValue: featureValue
        };
      }
    }
  }
}

/**
 * returns an array of the column names
 * if originalColumns is provided, it will be used to fill in the column names
 * when originalColumns is not provided, the column names will be null and the one hot features will be <original_column_number:feature_value>
 */
OneHot.prototype.getColumnsHeader = function(originalColumns) {
  if (!originalColumns) originalColumns = {};
  // create the header to return
  var header = [];

  // cache some values
  var numberOfEncodedFeatures = this.getNumberOfEncodedFeatures();
  var numberOfNonEncodedFeatures = this.getNumberOfNonEncodedFeatures();
  var originalColumnsLength = _.size(originalColumns);

  // first pad the array
  for (var i = 0; i < numberOfEncodedFeatures; i++) {
    header.push(null);
  }

  // the problem here is that originalColumns contains columns that were one hot encoded
  // so we need to build a new array that only contains the non one hot encoded columns
  var originalColumnsNotEncoded = []; // this will be empty when originalColumns is undefined
  for (var i = 0; i < originalColumnsLength; i++) {
    if (!this.isOriginalIndexOneHot(i)) originalColumnsNotEncoded.push(originalColumns[i]);
  }

  // the first n columns are going to be the originalColumnsNotEncoded so push those if we have them
  for (var i = 0; i < numberOfNonEncodedFeatures; i++) {
    if (originalColumnsNotEncoded[i]) {
      header[i] = originalColumnsNotEncoded[i];
    }
  }

  var originalIndex;
  var featureValue;
  // the rest of the columns are the encoded columns
  // so push each one of those to the correct place
  for (var encodedIndex = numberOfNonEncodedFeatures; encodedIndex < numberOfEncodedFeatures; encodedIndex++) {
    // using encodedIndex try to get the featureValue from originalColumns
    originalIndex = this.getOriginalIndexFromEncodedIndex(encodedIndex);
    // now all we need to get is the featureValue
    featureValue = this.getFeatureValueFromEncodedIndex(encodedIndex);

    // we want to push either the original <column_name:feature_value> or <original_column_number:feature_value>
    // check if that index is in originalColumns
    if (originalColumns[originalIndex]) {
      header[encodedIndex] = columnKeyToString(originalColumns[originalIndex], featureValue);
    } else {
      header[encodedIndex] = columnKeyToString(originalIndex, featureValue);
    }
  }
  return header;
}

/**
 * returns the number of original features
 */
OneHot.prototype.getNumberOfOriginalFeatures = function() {
  return this.numberOfOriginalFeatures;
}

/**
 * returns the number of encoded features (not to be confused with one hot features)
 */
OneHot.prototype.getNumberOfEncodedFeatures = function() {
  return this.numberOfInternalFeatures - this.indexes.length;
}

/**
 * returns the number of non one hot encoded features
 */
OneHot.prototype.getNumberOfNonEncodedFeatures = function() {
  return this.numberOfOriginalFeatures - this.indexes.length;
}

/**
 * Given the internal index saved on indexesFeatures, return the encoded index
 */
OneHot.prototype.getEncodedIndexFromInternalIndex = function(internalIndex) {
  // in docs
  if (typeof internalIndex === 'undefined') return;
  return internalIndex - this.indexes.length;
}

/**
 * Given the encoded index, return the internal index saved on indexesFeatures
 */
OneHot.prototype.getInternalIndexFromEncodedIndex = function(encodedIndex) {
  if (typeof encodedIndex === 'undefined') return;
  return encodedIndex + this.indexes.length;
}

/**
 * Given the internal index saved on indexesFeatures, return original index
 */
OneHot.prototype.getOriginalIndexFromInternalIndex = function(internalIndex) {
  // in docs
  if (typeof internalIndex === 'undefined') return;
  return this.internalIndexToOriginalIndex[internalIndex];
}

/**
 * Given the original index, return the internal index saved on indexesFeatures
 */
OneHot.prototype.getInternalIndexFromOriginalIndex = function(originalIndex, feature) {
  // in docs
  if (typeof originalIndex === 'undefined') return;
  if (typeof feature === 'undefined') throw new Error('feature is undefined');
  // or undefined if that feature was not found
  var featureValues = this.indexesFeatures[originalIndex];
  if (typeof featureValues === 'undefined') return;
  return featureValues[feature]; // internal index
}

/**
 * Given the original index, return the encoded index
 * Because this is a one to many, we need the feature as well
 */
OneHot.prototype.getEncodedIndexFromOriginalIndex = function(originalIndex, feature) {
  // in docs
  if (typeof originalIndex === 'undefined') return;
  if (typeof feature === 'undefined') throw new Error('feature is undefined');
  return this.getEncodedIndexFromInternalIndex(this.getInternalIndexFromOriginalIndex(originalIndex, feature));
}

/**
 * Given the encoded index, return the original index
 */
OneHot.prototype.getOriginalIndexFromEncodedIndex = function(encodedIndex) {
  // in docs
  if (typeof encodedIndex === 'undefined') return;
  return this.getOriginalIndexFromInternalIndex(this.getInternalIndexFromEncodedIndex(encodedIndex));
}

/**
 * returns true if the encoded index given is a one hot index
 */
OneHot.prototype.isEncodedIndexOneHot = function(encodedIndex) {
  var originalIndex = this.getOriginalIndexFromEncodedIndex(encodedIndex);
  return this.isOriginalIndexOneHot(originalIndex);
}

/**
 * returns true if the original index given is a one hot index
 */
OneHot.prototype.isOriginalIndexOneHot = function(originalIndex) {
  return (typeof originalIndex !== 'undefined' && typeof this.indexesFeatures[originalIndex] !== 'undefined');
}

/**
 * Given the encoded index, return the feature value for that index
 */
OneHot.prototype.getFeatureValueFromEncodedIndex = function(encodedIndex) {
  var originalIndex = this.getOriginalIndexFromEncodedIndex(encodedIndex);
  var internalIndex = this.getInternalIndexFromEncodedIndex(encodedIndex);
  if (typeof originalIndex === 'undefined') return;
  var featureValues = this.indexesFeatures[originalIndex];
  if (typeof featureValues === 'undefined') return;
  // TODO: create a reverse index for this
  for (var featureValue in featureValues) {
    if (featureValues[featureValue] === internalIndex) return featureValue;
  }
  return;
}


function columnKeyToString(originalIndex, featureValue) {
  return originalIndex + ':' + featureValue;
}

function _encode(iv, cb) {
  var encodedIV = _.clone(iv, true);
  // init the new features
  for (var i = this.numberOfOriginalFeatures; i < this.numberOfInternalFeatures; i++) {
    encodedIV.push(this.coldValue);
  };
  var indexes = this.indexes;
  var indexesFeatures = this.indexesFeatures;

  // encode each index one by one
  var originalIVIndex;
  var featureValue;
  var indexFeatures;
  var encodedIVIndex;
  for (var i = 0; i < indexes.length; i++) {
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
  if (this.numberOfInternalFeatures === 0 && iv.length !== 0) {
    this.numberOfInternalFeatures = iv.length;
    this.numberOfOriginalFeatures = iv.length;
  }

  // get the categorical indexes
  this.indexes = _.union(this.indexes, getCategoricalIndices(iv));
  var indexes = this.indexes;
  var indexesFeatures = this.indexesFeatures;
  var internalIndexToOriginalIndex = this.internalIndexToOriginalIndex;
  // now get the features at each index
  var originalIndex;
  var featureValue;
  var indexFeatures;
  for (var i = 0; i < indexes.length; i++) {
    originalIndex = indexes[i];
    featureValue = iv[originalIndex];
    if (typeof indexesFeatures[originalIndex] === 'undefined') indexesFeatures[originalIndex] = {};
    indexFeatures = indexesFeatures[originalIndex];
    if (typeof indexFeatures[featureValue] === 'undefined') {
      indexFeatures[featureValue] = this.numberOfInternalFeatures;
      internalIndexToOriginalIndex[this.numberOfInternalFeatures] = originalIndex;
      this.numberOfInternalFeatures++;
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
