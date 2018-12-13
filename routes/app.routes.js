const auth_middleware = require('../middlewares/authentication.middleware.js'),
      user_controller = require('../controllers/user.controller.js'),
      topics_controller = require('../controllers/topics.controller.js'),
      validator_middleware = require('../middlewares/validators.middleware.js');

module.exports = function(app) {
  app.get('/', user_controller.index);
  app.post('/', validator_middleware.emailValidator, user_controller.handleForm);
  app.get('/thanks', user_controller.confirmation);
  app.get('/authenticate', user_controller.authenticate);

  app.get('/topics/:type?', auth_middleware, topics_controller.read);
  app.post('/topics/:type?', auth_middleware, topics_controller.update);

  app.get('/user', auth_middleware, user_controller.update);
  app.post('/user', auth_middleware, validator_middleware.emailValidator, user_controller.updateForm);
  app.get('/user/delete', auth_middleware, user_controller.delete);
  app.post('/user/delete', auth_middleware, user_controller.deleteConfirmation);

  /**
   * Healthcheck
   */
  app.get('/health-check', (req, res) => res.send('OK'));
};
