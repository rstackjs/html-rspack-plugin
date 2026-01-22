// @ts-nocheck
'use strict';

module.exports = function (err) {
  return {
    toHtml: function () {
      return '[html-rspack-plugin]:\n<pre>\n' + this.toString() + '</pre>';
    },
    toJsonHtml: function () {
      return JSON.stringify(this.toHtml());
    },
    toString: function () {
      if (err.message) {
        return (
          `[html-rspack-plugin]: ` +
          (err.stack || `${err.name}: ${err.message}`)
        );
      }
      return err;
    },
  };
};
