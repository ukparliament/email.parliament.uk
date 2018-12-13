const topics = require('../models/topics.model.js'),
      user   = require('../models/user.model.js');

const controller = {
  async update(req, res) {
    const redirect = req.params.type ? '/topics/subscribed' : '/topics';
    const subscribingTo = req.params.type ? false : true;
    let userObject = {
      email_address: req.session.user.email_address
    };
    let messages = [];

    if('merge_fields' in req.body) {
      messages = messages.concat(req.body.merge_fields.map(val => topics.getTopicById(val)));
      userObject.merge_fields = await topics.convertMergeFieldsToObject(userObject.email_address, req.body.merge_fields, subscribingTo);
    }

    if('interests' in req.body) {
      messages = messages.concat(req.body.interests.map(val => topics.getTopicById(val)));
      userObject.interests = topics.convertInterestsArrayToObject(req.body.interests, subscribingTo);
    }

    if(userObject.interests || userObject.merge_fields) {
      req.session.messages = await topics.generateMessages(Promise.all(messages), subscribingTo);
      return user.update(userObject).then(() => res.redirect(redirect));
    }

    // Otherwise, just show the topics page again
    return res.redirect(redirect);
  },
  async read(req, res) {
    const getSubscribed = req.params.type ? true : false;
    const view = req.params.type ? 'topics/list-subscribed' : 'topics/list';
    const title = req.params.type ? 'Your subscriptions' : 'All subscriptions';

    const account = await user.read(req.session.user.email_address);
    const userSubscriptions = await user.getSubscriptions(account);

    const allTopics = await topics.getTopics();
    const filtered = await topics.filterTopicsByUserSubscription(allTopics, userSubscriptions, getSubscribed);

    return res.render(view, { PAGE_TITLE: title, TOPICS: filtered, USER_SUBSCRIPTIONS_COUNT: userSubscriptions.length });
  }
};

module.exports = controller;
