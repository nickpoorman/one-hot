# one-hot

One hot encode vectors using a streaming implementation.

See Wikipedia [https://en.wikipedia.org/wiki/One-hot](https://en.wikipedia.org/wiki/One-hot).

``` javascript
var OneHot = require('one-hot');
```

## var oneHot = new OneHot()

Instantiate a new instance of OneHot

### var index = getEncodedColumnIndex(originalIndex, featureValue)

This method will return the new index (the hot index) of a given original index and it's feature value. For example:

``` javascript
var oneHot = new OneHot()
var ws = oneHot.analyze()
var originalIVs = [[1, 2, 3, 'a'], [1, 2, 3, 'b']]
... // removed for brevity (see tests)
var index = getEncodedColumnIndex(3, 'a'); // index could be 3 or 4, [1, 2, 3, 1, 0], or [1, 2, 3, 0, 1] depending on the order in which the ivs were processed
```

## Streaming

These are the streaming methods. See test directory for an example.

### var writeStreamAnalyze = oneHot.analyze()

This must be called with a single pass over all the data to determine how to one hot encode the data.

### var writeStreamEncode = oneHot.encode()

This method will one hot encode each input vector via stream transform. Call this method after `oneHot.analyze()` has completed.

## Non-Streaming

These are the non-streaming methods.

### oneHot.analyze(data, cb)

This must be called with a single pass over all the data to determine how to one hot encode the data. `data` must be an array of input vectors and `cb` must be a callback.

### oneHot.encode(data, cb)

This method will one hot encode each input vector in `data`. `data` must be an array of input vectors and `cb` must be a callback with a signature of `(err, encodedData)` where `encodedData` will be all the one hot encoded data. Call this method after `oneHot.analyze()` has completed.

## Example

See tests folder for more examples...

``` javascript
var testIVs = [
  [0, 1, 2, 'a', 3],
  [3, 4, 5, 'b', 6],
  [6, 7, 8, 'c', 9]
];

var oneHot = new OneHot();
oneHot.analyze(testIVs, function(err) {
  if (err) throw err;

  oneHot.encode(testIVs, function(err, encodedData) {
    if (err) throw err;

    // print out the encoded input vectors
    console.log(encodedData);
  });
});
```
