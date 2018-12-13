const topics = require('../models/topics.model.js'),
      user = require('../models/user.model.js'),
      { validationResult } = require('express-validator/check');

const controller = {
  async index(req, res) {
    let topic;

    if(req.query.topic_id) {
      topic = await topics.getTopicById(req.query.topic_id);
    }

    return res.render('index', { PAGE_TITLE: 'Keep up to date', TOPIC: topic || null });
  },
  async handleForm(req, res) {
    let redirect = '/';
    const { email, merge_fields } = req.body;
    const errors = validationResult(req);
    const userObject = {
      email_address: email
    };

    if(!errors.isEmpty()) {
      req.session.errors = errors.array().map(message => message.msg);
      return res.redirect(redirect);
    }

    try {
      req.session.email = email;
      merge_fields ? userObject.merge_fields = await topics.convertMergeFieldsToObject(email, merge_fields, 'pending') : null;
      await user.create(userObject);
      redirect = '/thanks';
    }
    catch(e) {
      console.log('Error on signup', JSON.stringify(e)); // For CloudWatch debugging
      req.session.errors.push('An error has occurred. Please try again.');
    }

    return res.redirect(redirect);
  },
  confirmation(req, res) {
    if(!req.session.email) {
      return res.redirect('/');
    }
    return res.render('thanks', { PAGE_TITLE: 'Confirm your email address' });
  },
  async authenticate(req, res) {
    let redirect = req.query.return ? `/${req.query.return}` : '/topics';

    try {
      const account = await user.authenticate(req.query.id);
      req.session.user = account;
      if(account.merge_fields.hasOwnProperty('OLD_EMAIL') && account.merge_fields.OLD_EMAIL) {
        const old = await user.checkIfExists(account.merge_fields.OLD_EMAIL);
        account.merge_fields = old.merge_fields;
        account.interests = old.interests;
        await user.delete(old.email_address);
      }
      if(account.merge_fields.hasOwnProperty('AEID_PEND') && account.merge_fields.AEID_PEND) {
        account.merge_fields = await topics.convertMergeFieldsToObject(account.email_address, account.merge_fields.AEID_PEND.split(','), 'switch');
      }
      account.status = 'subscribed';
      await user.update(account);
    }
    catch(e) {
      console.log('Error on authentication', JSON.stringify(e)); // For CloudWatch debugging
      req.session.errors.push('There has been an error. Please try again.');
      redirect = '/';
    }

    return res.redirect(redirect);
  },
  async update(req, res) {
    const account = await user.read(req.session.user.email_address);
    const userSubscriptions = user.getSubscriptions(account);
    return res.render('user/index', { PAGE_TITLE: 'Your details', USER: account, USER_SUBSCRIPTIONS_COUNT: userSubscriptions.length });
  },
  async updateForm(req, res) {
    const errors = validationResult(req);

    // User hasn't actually changed their email address
    if(req.session.user.email_address === req.body.email) {
      return res.redirect('/user');
    } else if(!errors.isEmpty()) {
      for (let i = 0; i < errors.array().length; i++) {
        req.session.errors.push({
          message: errors.array()[i].msg
        });
      }
      return res.redirect('/user');
    } else {
      const userObject = {
        email_address: req.body.email
      };

      try {
        const check = await user.checkIfExists(req.body.email);
        req.session.errors.push({
          message: 'This email address is already subscribed.'
        });
      }
      catch(e) {
        userObject.merge_fields = {
          OLD_EMAIL: req.session.user.email_address
        }
        const newUser = await user.create(userObject);
        req.session.messages = `We've sent an email to ${req.body.email}. Click the link in the email to confirm your change of email address.`;
      }

      return res.redirect('/user');
    }
  },
  delete(req, res) {
    return res.render('user/delete', { PAGE_TITLE: 'Delete my details' });
  },
  deleteConfirmation(req, res) {
    user.delete(req.session.user.email_address).then(() => {
      req.session.user = null;
      return res.render('user/delete-confirmation', { PAGE_TITLE: 'We\'re deleting your details' });
    });
  }
};

module.exports = controller;
