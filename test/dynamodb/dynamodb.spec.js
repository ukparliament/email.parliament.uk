const { assert }   = require('chai'),
      ddblocal     = require('local-dynamo'),
      ddbUtilities = require('../utilities/dynamodb.js'),
      dynamodb     = require('../../dynamodb/dynamodb.js'),
      expected     = require('../expected/dynamodb.json'),
      fixtures     = require('../fixtures/dynamodb.json');

describe('DynamoDB', () => {

  let dynamodbInstance;

  before(async () => {
    dynamodbInstance = ddblocal.launch(null, 8000);
    await ddbUtilities.setupTable();
    await ddbUtilities.populateTable(fixtures.feeds);
  });

  after(async () => {
    await ddbUtilities.deleteTable();
    dynamodbInstance.kill();
  });

  describe('getTopicsFromDynamoDB', () => {
    it('returns an array of all topics', async () => {
      const result = await dynamodb.getTopicsFromDynamoDB();
      return assert.deepEqual(result, expected.getTopicsFromDynamoDB);
    });
  });

  describe('formatItem', () => {
    it('returns a singular formatted item', async () => {
      const items = await dynamodb.getTopicsFromDynamoDB();
      const result = dynamodb.formatItem(items[0]);
      return assert.deepEqual(result, expected.formatItem);
    });
  });

  describe('formatItems', () => {
    it('returns an array of formatted items', async () => {
      const items = await dynamodb.getTopicsFromDynamoDB();
      const result = dynamodb.formatItems(items);
      return assert.deepEqual(result, expected.formatItems);
    });
  });

});
