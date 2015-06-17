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

  it('should return the correct number of original features', function(done) {

    var testIVs = [
      [1, 2, 3, 'a', 4, 'c', 5],
      [1, 2, 3, 'b', 4, 'd', 5]
    ];

    var numberOfOriginalFeatures = 7; // 7 {1, 2, 3, 'a', 4, 'c', 5}

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      oneHot.getNumberOfOriginalFeatures().should.be.eql(numberOfOriginalFeatures);
      done();
    });
  });

  it('should return the correct number of encoded features', function(done) {

    var testIVs = [
      [1, 2, 3, 'a', 4, 'c', 5],
      [1, 2, 3, 'b', 4, 'd', 5]
    ];

    var numberOfEncodedColumns = 9; // 9, 5 non one hot + 4 one hot {a, b, c, d}

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      oneHot.getNumberOfEncodedFeatures().should.be.eql(numberOfEncodedColumns);
      done();
    });
  });

  it('should return the correct number of non encoded features', function(done) {

    var testIVs = [
      [1, 2, 3, 'a', 4, 'c', 5],
      [1, 2, 3, 'b', 4, 'd', 5]
    ];

    var numberOfNonEncodedColumns = 5; // 5, {1, 2, 3, 4, 5}

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      oneHot.getNumberOfNonEncodedFeatures().should.be.eql(numberOfNonEncodedColumns);
      done();
    });
  });

  it('should properly get the encoded index from the original index', function(done) {
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

  it('should return true for the encoded indexes that are one hot', function(done) {
    var testIVs = [
      [1, 2, 3, 'a'],
      [1, 2, 3, 'b']
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      oneHot.isEncodedIndexOneHot(0).should.be.eql(false);
      oneHot.isEncodedIndexOneHot(1).should.be.eql(false);
      oneHot.isEncodedIndexOneHot(2).should.be.eql(false);
      oneHot.isEncodedIndexOneHot(3).should.be.eql(true);
      done();
    });
  });

  it('should return true for the original indexes that are one hot', function(done) {
    var testIVs = [
      [1, 2, 3, 'a'],
      [1, 2, 3, 'b']
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      oneHot.isOriginalIndexOneHot(0).should.be.eql(false);
      oneHot.isOriginalIndexOneHot(1).should.be.eql(false);
      oneHot.isOriginalIndexOneHot(2).should.be.eql(false);
      oneHot.isOriginalIndexOneHot(3).should.be.eql(true);
      done();
    });
  });

  it('should return the feature value at the given index', function(done) {
    var testIVs = [
      [1, 2, 3, 'a'],
      [1, 2, 3, 'b']
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      oneHot.getFeatureValueFromEncodedIndex(3).should.be.eql('a'); // 'a'
      oneHot.getFeatureValueFromEncodedIndex(4).should.be.eql('b');; // 'b'
      done();
    });
  });

  it('should build the correct column header', function(done) {
    var testIVs = [
      [1, 2, 3, 'a', 4],
      [1, 2, 3, 'b', 4]
    ];

    var originalHeader = ['one', 'two', 'three', 'char', 'four'];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      var columnHeader = oneHot.getColumnsHeader(originalHeader);
      columnHeader.should.be.eql(['one', 'two', 'three', 'four', 'char:a', 'char:b']);
      done();
    });
  });

  it('should build the correct column header witout original header', function(done) {
    var testIVs = [
      [1, 2, 3, 'a', 4],
      [1, 2, 3, 'b', 4]
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      var columnHeader = oneHot.getColumnsHeader();
      columnHeader.should.be.eql([null, null, null, null, '3:a', '3:b']);
      done();
    });
  });


  it('should build the correct column header without an original header', function(done) {
    var testIVs = [
      [1, 2, 3, 'a', 4],
      [1, 2, 3, 'b', 4]
    ];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      var columnHeader = oneHot.getColumnsHeader();
      columnHeader.should.be.eql([null, null, null, null, '3:a', '3:b']);
      done();
    });
  });

  it('should build the correct column header with multiple one hot columns', function(done) {
    var testIVs = [
      [1, 2, 3, 'a', 4, 'c', 5],
      [1, 2, 3, 'b', 4, 'd', 5]
    ];

    var originalHeader = ['one', 'two', 'three', 'first_char', 'four', 'second_char', 'five'];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      var columnHeader = oneHot.getColumnsHeader(originalHeader);
      columnHeader.should.be.eql(['one', 'two', 'three', 'four', 'five', 'first_char:a', 'second_char:c', 'first_char:b', 'second_char:d']);
      done();
    });
  });

  it('should build a column header that represents the encoded input vector', function(done) {
    var testIVs = [
      [1, 2, 3, 'a', 4, 'c', 5],
      [1, 2, 3, 'b', 4, 'd', 5]
    ];

    var validateIVs = [
      [1, 2, 3, 'a', 4, 'c', 5],
      [1, 2, 3, 'b', 4, 'd', 5],
      [1, 2, 3, 'a', 4, 'd', 5],
      [1, 2, 3, 'b', 4, 'c', 5],
      [1, 2, 3, 'e', 4, 'e', 5]
    ];

    var originalHeader = ['one', 'two', 'three', 'first_char', 'four', 'second_char', 'five'];

    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      var columnHeader = oneHot.getColumnsHeader(originalHeader);
      columnHeader.should.be.eql(['one', 'two', 'three', 'four', 'five', 'first_char:a', 'second_char:c', 'first_char:b', 'second_char:d']);

      // you should never put different data into encode that wasn't included in analyze
      // this is just for testing
      oneHot.encode(validateIVs, function(err, data) {
        if (err) throw err;

        data[0].should.eql([1, 2, 3, 4, 5, 1, 1, 0, 0]);
        data[1].should.eql([1, 2, 3, 4, 5, 0, 0, 1, 1]);
        data[2].should.eql([1, 2, 3, 4, 5, 1, 0, 0, 1]);
        data[3].should.eql([1, 2, 3, 4, 5, 0, 1, 1, 0]);
        data[4].should.eql([1, 2, 3, 4, 5, 0, 0, 0, 0]);

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
