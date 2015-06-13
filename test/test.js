var should = require('should');
var _ = require('lodash');
var OneHot = require('../');

var testIVs = [
  [0, 1, 2, 'a'],
  [3, 4, 5, 'b'],
  [6, 7, 8, 'c']
];

describe('one hot', function() {

  it('should one hot encode the string features in the input vectors', function() {
    var oneHot = new OneHot();
    oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      encode(testIVs, function(err, data) {
        if (err) throw err;

        data.forEach(function(row) {
          row.should.have.lengthOf(6);
        });

        data[0].should.eql([0, 1, 2, 1, 0, 0]);
        data[1].should.eql([0, 1, 2, 0, 1, 0]);
        data[2].should.eql([0, 1, 2, 0, 0 1]);
      });
    });
  });
});

describe('one hot - streaming', function() {

  it('should one hot encode the string features in the input vectors', function() {

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

    var analyzeWS = oneHot.analyze(testIVs, function(err) {
      if (err) throw err;

      var encodeWS = encode(testIVs);

      var data = [];
      var sync = new stream.Writable({
        write: function(chunk, encoding, next) {
          data.push(chunk);
        },
        objectMode: true
      });

      sync.on('finish', function() {
        data.forEach(function(row) {
          row.should.have.lengthOf(6);
        });

        data[0].should.eql([0, 1, 2, 1, 0, 0]);
        data[1].should.eql([0, 1, 2, 0, 1, 0]);
        data[2].should.eql([0, 1, 2, 0, 0 1]);
      });

      encodeWS.pipe(sync);
    });

    ingestData(analyzeWS, testIVs);
  });
})
