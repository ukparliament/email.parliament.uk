const MailChimp = require('mailchimp-api-v3'),
      aws = require('../dynamodb/helper.js'),
      mailchimp = new MailChimp(process.env.MC_API_KEY),
      user = require('../models/user.model.js');

const topics = {
  async convertMergeFieldsToObject(email, merge_fields, subscribeTo) {
    const mergeFieldsObject = {};
    let subscribedAeids = (subscribeTo && subscribeTo !== 'pending') ? merge_fields : [];
    let pendingAeids = (subscribeTo === 'pending') ? merge_fields : [];
    let unsubscribeAeids = (!subscribeTo) ? merge_fields : [];

    try {
      let existingUser = await user.checkIfExists(email);

      for(let existingMergeKey in existingUser.merge_fields) {
        if(existingMergeKey.startsWith('AEID') && !existingMergeKey.startsWith('AEID_PEND')) {
          subscribedAeids = subscribedAeids.concat(existingUser.merge_fields[existingMergeKey].split(',').filter(val => val));
        }
        if(existingMergeKey.startsWith('AEID_PEND')) {
          pendingAeids = pendingAeids.concat(existingUser.merge_fields[existingMergeKey].split(',').filter(val => val));
        }
      }

      let count = 0;
      while(subscribedAeids.length > 0) {
        let newKey = `AEID_${count}`;
        mergeFieldsObject[newKey] = mergeFieldsObject[newKey] || [];

        const concatted = mergeFieldsObject[newKey].concat(subscribedAeids.slice(0, 1));

        if(concatted.join(',').length > 255) {
          count = count + 1;
        } else {
          mergeFieldsObject[newKey] = mergeFieldsObject[newKey].concat(subscribedAeids.splice(0, 1));
        }
      }

    }
    catch(error) {
      console.log('Error finding user:', error);
    }

    mergeFieldsObject.AEID_PEND = (subscribeTo === 'switch') ? [] : pendingAeids;
    for(let key in mergeFieldsObject) {
      mergeFieldsObject[key] = mergeFieldsObject[key].filter(val => !unsubscribeAeids.includes(val)).join(',');
    }

    return mergeFieldsObject;
  },
  convertInterestsArrayToObject(interests, subscribeTo) {
    const object = {};
    for (let i = 0; i < interests.length; i++) {
      object[interests[i]] = subscribeTo;
    }
    return object;
  },
  flattenTopics(topics) {
    let merged = [];
    for(const key in topics) {
      topics[key].forEach(item => {
        merged = merged.concat(item.items);
      });
    }
    return merged;
  },
  cachedTopics: {
    last_updated: null,
    topics: []
  },
  setCachedTopics(topics) {
    this.cachedTopics = {
      last_updated: new Date(),
      topics
    };
    return this.cachedTopics;
  },
  getCachedTopics() {
    return this.cachedTopics;
  },
  async getTopicById(topic_id) {
    const allTopics = await this.getTopics();
    return this.flattenTopics(allTopics).find(val => val.id === topic_id);
  },
  async getTopics() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    let topics = this.cachedTopics.topics;

    if(this.cachedTopics.last_updated < yesterday) {

      const automatedTopics = await this.getTopicsFromDynamoDB();
      const interestCategories = await this.getInterestCategories();
      const editorialInterests = await this.getInterestCategoryByIds(interestCategories);

      topics = {
        automated: [
          {
            title: 'Committee updates',
            items: automatedTopics.filter(val => val.type.S === 'committee').map(item => ({
              id: item.topic_id.S,
              aeid: true,
              title: item.title.S,
              description: item.description ? item.description.S : null,
              type: item.type ? item.type.S : null
            }))
          },
          {
            title: 'Bill updates',
            items: automatedTopics.filter(val => val.type.S === 'public_bill' || val.type.S === 'private_bill').map(item => ({
              id: item.topic_id.S,
              aeid: true,
              title: item.title.S,
              description: item.description ? item.description.S : null,
              type: item.type ? item.type.S : null
            }))
          }
        ],
        editorial: interestCategories.map(category => ({
          title: category.title,
          items: editorialInterests.find(interest => category.id == interest.category_id).interests.map(interest => ({
            id: interest.id,
            title: interest.name
          }))
        }))
      };

      this.setCachedTopics(topics);
    }

    return topics;
  },
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
  getInterestCategories() {
    return mailchimp.get(`/lists/${process.env.MC_LIST_ID}/interest-categories`).then(result => result.categories.map(val => ({
      id: val.id,
      title: val.title
    })));
  },
  getInterestCategoryById(id) {
    return mailchimp.get(`/lists/${process.env.MC_LIST_ID}/interest-categories/${id}/interests`);
  },
  getInterestCategoryByIds(categories) {
    const promises = [];

    for (let i = 0; i < categories.length; i++) {
      promises.push(this.getInterestCategoryById(categories[i].id));
    }

    return Promise.all(promises);
  },
  async filterTopicsByUserSubscription(email, getSubscribed, filterableTopics) {
    const preferences = await user.read(email);

    let allMergeFields = [];
    for(const key in preferences.merge_fields) {
      if(key.startsWith('AEID') && !key.startsWith('AEID_PEND')) {
        allMergeFields = allMergeFields.concat(preferences.merge_fields[key].split(',').filter(val => val));
      }
    }

    if(getSubscribed) {
      filterableTopics = this.flattenTopics(filterableTopics);
      return filterableTopics.filter(val => preferences.interests[val.id] || allMergeFields.includes(val.id));
    }

    return filterableTopics;
  }
};

module.exports = topics;
