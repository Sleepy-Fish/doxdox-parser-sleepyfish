const assert = require('assert');
const fs = require('fs');

const parser = require('../../index');
const files = ['dox', 'facade'];

describe('doxdox parser', function () {
  for (const file of files) {
    it(`run dox parser on ${file}.js`, function () {
      const contents = fs.readFileSync(`./test/fixtures/${file}.js`, 'utf8');
      const methods = parser(contents, `${file}.js`);
      const data = fs.readFileSync(`./test/fixtures/${file}.json`, 'utf8');

      assert.deepStrictEqual(methods, JSON.parse(data));
    });
  }
});
