const MailChimp = require('mailchimp-api-v3'),
      dynamodb  = require('../dynamodb/dynamodb.js'),
      helpers   = require('../helpers/helpers.js'),
      mailchimp = new MailChimp(process.env.MC_API_KEY),
      user      = require('../models/user.model.js');

const topics = {
  cachedTopics: {
    last_updated: null,
    topics: []
  },
  async generateMessages(allPromises, subscribingTo) {
    allPromises = await allPromises;
    let string = '';
    let language = {
      action: subscribingTo ? 'subscribed' : 'unsubscribed',
      preposition: subscribingTo ? 'to' : 'from'
    };

    if(allPromises.length === 1) {
      string = allPromises.splice(0, 1).map(val => val.title).join(', ');
    }
    if(allPromises.length === 2) {
      string = allPromises.splice(0, 2).map(val => val.title).join(', and ');
    }
    if(allPromises.length === 3) {
      string = `${allPromises.splice(0, 2).map(val => val.title).join(', ')}, and ${allPromises.splice(0, 1).map(val => val.title)}`;
    }
    if(allPromises.length > 3) {
      string = `${allPromises.splice(0, 3).map(val => val.title).join(', ')}, and ${allPromises.length} more`;
    }

    return `You've ${language.action} ${language.preposition} ${string}.`;
  },
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
  async getTopicById(topic_id) {
    const allTopics = await this.getTopics();
    return this.flattenTopics(allTopics).find(val => val.id === topic_id);
  },
  async getTopics() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if(topics.cachedTopics.last_updated < yesterday) {
      await topics.getTopicsFromSources();
    }
    return topics.cachedTopics.topics;
  },
  async getTopicsFromSources() {
    const dynamoTopics = await dynamodb.getTopicsFromDynamoDB();
    const mcInterestCategories = await topics.getInterestCategories();
    const mcInterestCategoriesByIds = await topics.getInterestsFromInterestCategories(mcInterestCategories);
    topics.cachedTopics.topics = Object.assign(dynamodb.formatItems(dynamoTopics), topics.formatInterests(mcInterestCategories, mcInterestCategoriesByIds));
    topics.cachedTopics.last_updated = new Date();
    return topics.cachedTopics.topics;
  },
  async getInterestCategories() {
    const interests = await mailchimp.get(`/lists/${process.env.MC_LIST_ID}/interest-categories?count=50`);
    return interests.categories.map(val => ({
      id: val.id,
      title: val.title
    }));
  },
  getInterestsFromInterestCategory(id) {
    return mailchimp.get(`/lists/${process.env.MC_LIST_ID}/interest-categories/${id}/interests`);
  },
  getInterestsFromInterestCategories(categories) {
    return Promise.all(categories.map(val => topics.getInterestsFromInterestCategory(val.id)));
  },
  formatInterests(interestCategories, mcInterestCategoriesByIds) {
    return {
      editorial: interestCategories.map(category => Object.assign(category, {
        title: category.title,
        items: mcInterestCategoriesByIds.find(subCategory => subCategory.category_id == category.id).interests.map(interest => ({
          id: interest.id,
          title: interest.name
        })).sort(helpers.sortAlphabetically) || []
      }))
    };
  },
  filterTopicsByUserSubscription(topics, userSubscriptions, subscribed) {
    let filterableTopics = JSON.parse(JSON.stringify(topics)); // Majorly hacky to deep clone the object.
    for(const key in filterableTopics) {
      for (let i = 0; i < filterableTopics[key].length; i++) {
        filterableTopics[key][i].items = filterableTopics[key][i].items.filter(val => subscribed == userSubscriptions.includes(val.id));
      }
    }

    return subscribed ? this.flattenTopics(filterableTopics) : filterableTopics;
  },
};

module.exports = topics;
