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
          columnIndex = oneHot.getEncodedColumnIndex(encodeColumnIndex, iv[encodeColumnIndex]);
          if (typeof columnIndex === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndex] = 1;
          encodedTarget.should.eql(data[i]);
        }

        done();
      });
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
          columnIndex = oneHot.getEncodedColumnIndex(encodeColumnIndex, iv[encodeColumnIndex]);
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
          columnIndex = oneHot.getEncodedColumnIndex(encodeColumnIndexA, iv[encodeColumnIndexA]);
          if (typeof columnIndex === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndex] = 1;
          columnIndex = oneHot.getEncodedColumnIndex(encodeColumnIndexB, iv[encodeColumnIndexB]);
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
          columnIndex = oneHot.getEncodedColumnIndex(encodeColumnIndexA, iv[encodeColumnIndexA]);
          if (typeof columnIndex === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndex] = 1;
          columnIndex = oneHot.getEncodedColumnIndex(encodeColumnIndexB, iv[encodeColumnIndexB]);
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
          columnIndexA = oneHot.getEncodedColumnIndex(encodeColumnIndexA, iv[encodeColumnIndexA]);
          if (typeof columnIndexA === 'undefined') throw new Error('could not get encoded column index');
          encodedTarget[columnIndexA] = 1;
          columnIndexB = oneHot.getEncodedColumnIndex(encodeColumnIndexB, iv[encodeColumnIndexB]);
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
