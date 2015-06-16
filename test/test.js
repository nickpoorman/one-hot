var should = require('should');
var _ = require('lodash');
var OneHot = require('../');
var stream = require('stream');

describe('one hot', function() {

  it('should one hot encode the string features in the input vectors', function(done) {
    var encodeColumnIndex = 3;

    var testIVs = [
      [0, 1, 2, 'a', 3],
      [3, 4, 5, 'b', 6],
      [6, 7, 8, 'c', 9]
    ];

    var encodedIVs = [
      [0, 1, 2, 3, 0, 0, 0],
      [3, 4, 5, 6, 0, 0, 0],
      [6, 7, 8, 9, 0, 0, 0]
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      oneHot.encode(testIVs, function(err, data) {
        if (err) throw err;

        var iv;
        var columnIndex;
        var encodedTarget;
        for (var i = 0; i < testIVs.length; i++) {
          iv = testIVs[i];
          encodedTarget = _.clone(encodedIVs[i], true);
          columnIndex = oneHot.getEncodedIndexFromOriginalIndex(encodeColumnIndex, iv[encodeColumnIndex]);
          if (typeof columnIndex === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndex] = 1;
          encodedTarget.should.eql(data[i]);
        }

        done();
      });
    });
  });

  it('should properly get the encoded index from the original index', function(done) {
    var encodeColumnIndex = 3;

    var testIVs = [
      [1, 2, 3, 'a'],
      [1, 2, 3, 'b']
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      var encodedIndex = oneHot.getEncodedIndexFromOriginalIndex(3, 'a'); // encodedIndex could be 3 or 4, [1, 2, 3, 1, 0], or [1, 2, 3, 0, 1] depending on the order in which the ivs were processed
      encodedIndex.should.be.eql(3);
      done();
    });
  });

  it('should properly get the original index from the encoded index', function(done) {
    var encodeColumnIndex = 3;

    var testIVs = [
      [1, 2, 3, 'a'],
      [1, 2, 3, 'b']
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      var encodedIndex = oneHot.getOriginalIndexFromEncodedIndex(4); // 3
      encodedIndex.should.be.eql(3);
      done();
    });
  });

  it('should properly get the internal index from the original index', function(done) {
    var encodeColumnIndex = 3;

    var testIVs = [
      [1, 2, 3, 'a'],
      [1, 2, 3, 'b']
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      var encodedIndexA = oneHot.getInternalIndexFromOriginalIndex(3, 'a'); // 4, ie, [1, 2, 3, <encoded column: {a, b}>, 1, 0]
      var encodedIndexB = oneHot.getInternalIndexFromOriginalIndex(3, 'b'); // 5, ie, [1, 2, 3, <encoded column: {a, b}>, 0, 1]
      encodedIndexA.should.be.eql(4);
      encodedIndexB.should.be.eql(5);
      done();
    });
  });

  it('should properly get the original index from the internal index', function(done) {
    var encodeColumnIndex = 3;

    var testIVs = [
      [1, 2, 3, 'a'],
      [1, 2, 3, 'b']
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      var encodedIndexA = oneHot.getOriginalIndexFromInternalIndex(4); // 3, ie, [1, 2, 3, <encoded column: {a, b}>, 1, 0] => [1, 2, 3, 'a']
      var encodedIndexB = oneHot.getOriginalIndexFromInternalIndex(5); // 3, ie, [1, 2, 3, <encoded column: {a, b}>, 0, 1] => [1, 2, 3, 'b']
      encodedIndexA.should.be.eql(3);
      encodedIndexB.should.be.eql(3);
      done();
    });
  });

  it('should properly get the encoded index from the internal index', function(done) {
    var encodeColumnIndex = 3;

    var testIVs = [
      [1, 2, 3, 'a'],
      [1, 2, 3, 'b']
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      var encodedIndexA = oneHot.getEncodedIndexFromInternalIndex(4); // 3, ie, [1, 2, 3, <encoded column: {a, b}>, 1, 0] => [1, 2, 3, 1, 0]
      var encodedIndexB = oneHot.getEncodedIndexFromInternalIndex(5); // 4, ie, [1, 2, 3, <encoded column: {a, b}>, 0, 1] => [1, 2, 3, 0, 1]
      encodedIndexA.should.be.eql(3);
      encodedIndexB.should.be.eql(4);
      done();
    });
  });

  it('should properly get the internal index from the encoded index', function(done) {
    var encodeColumnIndex = 3;

    var testIVs = [
      [1, 2, 3, 'a'],
      [1, 2, 3, 'b']
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      var encodedIndexA = oneHot.getInternalIndexFromEncodedIndex(3); // 4, ie, [1, 2, 3, 1, 0] => [1, 2, 3, <encoded column: {a, b}>, 1, 0]
      var encodedIndexB = oneHot.getInternalIndexFromEncodedIndex(4); // 5, ie, [1, 2, 3, 0, 1] => [1, 2, 3, <encoded column: {a, b}>, 0, 1]
      encodedIndexA.should.be.eql(4);
      encodedIndexB.should.be.eql(5);
      done();
    });
  });
});

describe('one hot - streaming', function() {

  it('should one hot encode the string features in the input vectors', function(done) {

    var encodeColumnIndex = 3;

    var testIVs = [
      [0, 1, 2, 'a', 3],
      [3, 4, 5, 'b', 6],
      [6, 7, 8, 'c', 9]
    ];

    var encodedIVs = [
      [0, 1, 2, 3, 0, 0, 0],
      [3, 4, 5, 6, 0, 0, 0],
      [6, 7, 8, 9, 0, 0, 0]
    ];

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

    var oneHot = new OneHot();

    var analyzeWS = oneHot.analyze();

    analyzeWS.on('finish', function() {
      var encodeWS = oneHot.encode();

      var data = [];
      var collect = new stream.Writable({
        write: function(chunk, encoding, next) {
          data.push(chunk);
          return next();
        },
        objectMode: true
      });

      collect.on('finish', function() {
        var iv;
        var columnIndex;
        var encodedTarget;
        for (var i = 0; i < testIVs.length; i++) {
          iv = testIVs[i];
          encodedTarget = _.clone(encodedIVs[i], true);
          columnIndex = oneHot.getEncodedIndexFromOriginalIndex(encodeColumnIndex, iv[encodeColumnIndex]);
          if (typeof columnIndex === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndex] = 1;
          encodedTarget.should.eql(data[i]);
        }

        done();
      });

      encodeWS.pipe(collect);

      ingestData(encodeWS, testIVs);
    });

    ingestData(analyzeWS, testIVs);
  });
});

describe('one hot - multiple features', function() {

  it('should one hot encode the string features in the input vectors', function(done) {

    var encodeColumnIndexA = 3;
    var encodeColumnIndexB = 5;

    var testIVs = [
      [0, 1, 2, 'a', 3, 'c', 4],
      [3, 4, 5, 'b', 6, 'd', 7],
      [6, 7, 8, 'c', 9, 'e', 10]
    ];

    var encodedIVs = [
      [0, 1, 2, 3, 4, 0, 0, 0, 0, 0, 0],
      [3, 4, 5, 6, 7, 0, 0, 0, 0, 0, 0],
      [6, 7, 8, 9, 10, 0, 0, 0, 0, 0, 0]
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      oneHot.encode(testIVs, function(err, data) {
        if (err) throw err;

        var iv;
        var columnIndex;
        var encodedTarget;
        for (var i = 0; i < testIVs.length; i++) {
          iv = testIVs[i];
          encodedTarget = _.clone(encodedIVs[i], true);
          columnIndex = oneHot.getEncodedIndexFromOriginalIndex(encodeColumnIndexA, iv[encodeColumnIndexA]);
          if (typeof columnIndex === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndex] = 1;
          columnIndex = oneHot.getEncodedIndexFromOriginalIndex(encodeColumnIndexB, iv[encodeColumnIndexB]);
          if (typeof columnIndex === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndex] = 1;
          encodedTarget.should.eql(data[i]);
        }

        done();
      });
    });
  });
});

describe('one hot - multiple features - duplicate features', function() {

  it('should one hot encode the string features in the input vectors', function(done) {

    var encodeColumnIndexA = 3;
    var encodeColumnIndexB = 5;

    var testIVs = [
      [0, 1, 2, 'a', 3, 'c', 4],
      [3, 4, 5, 'b', 6, 'd', 7],
      [6, 7, 8, 'c', 9, 'e', 10],
      [11, 12, 13, 'c', 14, 'd', 15]
    ];

    var encodedIVs = [
      [0, 1, 2, 3, 4, 0, 0, 0, 0, 0, 0],
      [3, 4, 5, 6, 7, 0, 0, 0, 0, 0, 0],
      [6, 7, 8, 9, 10, 0, 0, 0, 0, 0, 0],
      [11, 12, 13, 14, 15, 0, 0, 0, 0, 0, 0]
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      oneHot.encode(testIVs, function(err, data) {
        if (err) throw err;

        var iv;
        var columnIndex;
        var encodedTarget;
        for (var i = 0; i < testIVs.length; i++) {
          iv = testIVs[i];
          encodedTarget = _.clone(encodedIVs[i], true);
          columnIndex = oneHot.getEncodedIndexFromOriginalIndex(encodeColumnIndexA, iv[encodeColumnIndexA]);
          if (typeof columnIndex === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndex] = 1;
          columnIndex = oneHot.getEncodedIndexFromOriginalIndex(encodeColumnIndexB, iv[encodeColumnIndexB]);
          if (typeof columnIndex === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndex] = 1;
          encodedTarget.should.eql(data[i]);
        }

        done();
      });
    });
  });
});

describe('one hot - single duplicate feature, different original columns', function() {

  it('should one hot encode the string features in the input vectors', function(done) {
    var encodeColumnIndexA = 3;
    var encodeColumnIndexB = 5;

    var testIVs = [
      [0, 1, 2, 'a', 3, 'a', 4]
    ];

    var encodedIVs = [
      [0, 1, 2, 3, 4, 0, 0]
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      oneHot.encode(testIVs, function(err, data) {
        if (err) throw err;

        var iv;
        var columnIndexA;
        var columnIndexB;
        var encodedTarget;
        for (var i = 0; i < testIVs.length; i++) {
          iv = testIVs[i];
          encodedTarget = _.clone(encodedIVs[i], true);
          columnIndexA = oneHot.getEncodedIndexFromOriginalIndex(encodeColumnIndexA, iv[encodeColumnIndexA]);
          if (typeof columnIndexA === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndexA] = 1;
          columnIndexB = oneHot.getEncodedIndexFromOriginalIndex(encodeColumnIndexB, iv[encodeColumnIndexB]);
          if (typeof columnIndexB === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndexB] = 1;
          columnIndexA.should.not.eql(columnIndexB);
          encodedTarget.should.eql(data[i]);
        }

        done();
      });
    });
  });
});

describe('one cold', function() {

  it('should one cold encode the string features in the input vectors', function(done) {
    var encodeColumnIndex = 3;

    var testIVs = [
      [0, 1, 2, 'a', 3],
      [3, 4, 5, 'b', 6],
      [6, 7, 8, 'c', 9]
    ];

    var encodedIVs = [
      [0, 1, 2, 3, 1, 1, 1],
      [3, 4, 5, 6, 1, 1, 1],
      [6, 7, 8, 9, 1, 1, 1]
    ];

    var oneHot = new OneHot({
      oneCold: true
    });
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      oneHot.encode(testIVs, function(err, data) {
        if (err) throw err;

        var iv;
        var columnIndex;
        var encodedTarget;
        for (var i = 0; i < testIVs.length; i++) {
          iv = testIVs[i];
          encodedTarget = _.clone(encodedIVs[i], true);
          columnIndex = oneHot.getEncodedIndexFromOriginalIndex(encodeColumnIndex, iv[encodeColumnIndex]);
          if (typeof columnIndex === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndex] = 0;
          encodedTarget.should.eql(data[i]);
        }

        done();
      });
    });
  });
});
