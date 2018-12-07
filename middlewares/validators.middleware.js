const { check } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const middleware = {
  emailValidator: [
    check('email').not().isEmpty().withMessage('An email address is required.'),
    check('email').isEmail().withMessage('A valid email address is required.'),
    sanitizeBody('email').escape().trim()
  ]
}

module.exports = middleware;
