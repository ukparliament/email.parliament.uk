const aws     = require('../dynamodb/helper.js'),
      helpers = require('../helpers/helpers.js');

const dynamodb = {
  topics: [],
  getTopicsFromDynamoDB(lastScan) {
    this.topics = (lastScan && lastScan.Items) ? this.topics.concat(lastScan.Items) : [];

    const assigned = Object.assign({}, { TableName: 'topics' });
    assigned.ExpressionAttributeValues = {
      ':a': {
        S: '0'
      }
    };
    assigned.FilterExpression = 'enabled <> :a';
    assigned.Limit = 100;

    if(lastScan !== undefined && lastScan.LastEvaluatedKey === undefined) {
      return new Promise((resolve) => {
        resolve(this.topics);
      });
    } else {
      assigned.ExclusiveStartKey = (lastScan && lastScan.LastEvaluatedKey) ? lastScan.LastEvaluatedKey : null;
      return aws.scan(assigned).promise().then((result) => this.getTopicsFromDynamoDB(result));
    }
  },
  formatItem(item) {
    const hasDescription = (item.description && item.description.hasOwnProperty('S'));
    return {
      id: item.topic_id.S,
      aeid: true,
      description: hasDescription ? item.description.S : null,
      title: item.title.S,
      type: item.type ? item.type.S : null
    };
  },
  formatItems(topics) {
    const formatted = topics.map(dynamodb.formatItem);

    return {
      automated: [
        {
          id: 'committee',
          title: 'Committee updates',
          items: formatted.filter(val => val.type == 'committee').sort(helpers.sortAlphabetically),
        },
        {
          id: 'bill',
          title: 'Bill updates',
          items: formatted.filter(val => val.type == 'public_bill' || val.type == 'private_bill').sort(helpers.sortAlphabetically)
        }
      ]
    };
  }
};

module.exports = dynamodb;
