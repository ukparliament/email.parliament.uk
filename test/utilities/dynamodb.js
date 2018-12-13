const aws    = require('../../dynamodb/helper.js'),
      crypto = require('crypto'),
      maxChunks = 25;

const params = { TableName: 'topics' };

const utilities = {
  formatArray(feeds) {
    return feeds.filter(item => item.rss_link).map(value => {
      const obj = {
        PutRequest: {
          Item: {
            topic_id: { S: crypto.createHash('md5').update(value.rss_link).digest('hex').substring(0, 8) }
          }
        }
      };

      for(const key in value) {
        obj.PutRequest.Item[key] = (value[key] ? { S: value[key].toString() } : { NULL: true });
      }

      return obj;
    });
  },
  populateTable(feeds) {
    const params = { RequestItems: { topics: [] } };
    const promises = [];

    feeds = this.formatArray(feeds);

    const totalCalls = Math.ceil(feeds.length / maxChunks);

    for (let i = 0; i < totalCalls; i++) {
      const chunk = params;
      chunk.RequestItems.topics = feeds.slice(i * maxChunks, (i * maxChunks) + maxChunks);
      promises.push(aws.batchWriteItem(chunk).promise());
    }

    return Promise.all(promises);
  },
  setupTable() {
    const assigned = Object.assign({}, params);
    assigned.KeySchema = [
      {
        AttributeName: 'topic_id',
        KeyType: 'HASH'
      }
    ];
    assigned.AttributeDefinitions = [
      {
        AttributeName: 'topic_id',
        AttributeType: 'S'
      }
    ],
    assigned.StreamSpecification = {
      StreamEnabled: false
    },
    assigned.ProvisionedThroughput = {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1
    }

    return aws.createTable(assigned).promise().then(() => aws.waitFor('tableExists', assigned));
  },
  deleteTable() {
    const assigned = Object.assign({}, params);
    return aws.deleteTable(params).promise().then(() => aws.waitFor('tableNotExists', assigned));
  }
};

module.exports = utilities;
