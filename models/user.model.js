const crypto    = require('crypto'),
      MailChimp = require('mailchimp-api-v3'),
      mailchimp = new MailChimp(process.env.MC_API_KEY);

const user = {
  async authenticate(id) {
    try {
      const account = await mailchimp.get(`/lists/${process.env.MC_LIST_ID}/members?unique_email_id=${id}&fields=total_items,members.email_address,members.id,members.unique_email_id,members.merge_fields,members.status`);
      if(account.total_items === 1) {
        return Promise.resolve(account.members.find(val => val.unique_email_id === id));
      }
    }
    catch(e) {
      return Promise.reject(e);
    }

    return Promise.reject('User does not exist');
  },
  async checkIfExists(email) {
    try {
      const account = await this.read(email);
      return Promise.resolve(account);
    }
    catch(error) {
      if(error.status === 404) {
        return Promise.reject('User does not exist.');
      }
      return Promise.reject(error);
    }
  },
  create(userObject) {
    // With `status` and `status_if_new` set to `pending`, it sends a double opt-in confirmation email to the address
    userObject = Object.assign(userObject, { status_if_new: 'pending', status: 'pending' });
    return mailchimp.put(`/lists/${process.env.MC_LIST_ID}/members/${crypto.createHash('md5').update(userObject.email_address).digest('hex')}`, userObject);
  },
  read(email) {
    return mailchimp.get(`/lists/${process.env.MC_LIST_ID}/members/${crypto.createHash('md5').update(email).digest('hex')}`);
  },
  update(userObject) {
    return mailchimp.put(`/lists/${process.env.MC_LIST_ID}/members/${crypto.createHash('md5').update(userObject.email_address).digest('hex')}`, userObject);
  },
  unsubscribe(email) {
    return mailchimp.patch(`/lists/${process.env.MC_LIST_ID}/members/${crypto.createHash('md5').update(email).digest('hex')}`, { status: 'unsubscribed' });
  },
  delete(email) {
    return mailchimp.delete(`/lists/${process.env.MC_LIST_ID}/members/${crypto.createHash('md5').update(email).digest('hex')}`);
  },
  getSubscriptions(account) {
    let preferences = [];

    Object.keys(account.merge_fields).forEach(key => {
      if(key.startsWith('AEID') && !key.startsWith('AEID_PEND')) {
        preferences = preferences.concat(account.merge_fields[key].split(','));
      }
    });

    Object.keys(account.interests).forEach(key => {
      if(account.interests[key]) {
        preferences.push(key);
      }
    });

    return preferences.filter(val => val);
  }
};

module.exports = user;
