const { assert } = require('chai'),
      sinon      = require('sinon'),
      helper     = require('../../dynamodb/helper.js');

describe('DynamoDB', () => {

  describe('uses the correct config', () => {
    it('returns the correct API version', () => {
      return assert.equal(helper.config.apiVersion, '2012-08-10');
    });
  });

});
