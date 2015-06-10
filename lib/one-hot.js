/**
 * One hot encode vectors using a streaming implementation.
 */

var stream = require('stream');
var inherits = require('util').inherits;
inherits(OneHot, stream.Readable);

function OneHot(opts) {
  if (!(this instanceof OneHot)) return new OneHot(opts);
  if (!opts) opts = {};



  return this;
}
