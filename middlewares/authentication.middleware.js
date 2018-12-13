const middleware = (req, res, next) => {
  if(req.session && req.session.user && req.session.user.id && req.session.user.email_address) {
    next();
  } else {
    return res.redirect('/');
  }
}

module.exports = middleware;
