const middleware = (req, res, next) => {
  res.locals.session = req.session;
  res.locals.sessionErrors = req.session.errors || [];
  req.session.errors = [];
  res.locals.messages = req.session.messages || [];
  req.session.messages = [];
  next();
}

module.exports = middleware;
