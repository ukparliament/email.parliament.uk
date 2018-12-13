const bodyParser = require('body-parser'),
      express    = require('express'),
      session    = require('express-session'),
      app        = express();

let sessCookies = {};
if(app.get('env') === 'production') {
  app.set('trust proxy', 1);
  sessCookies.secure = true;
}

const middlewares = [
  express.static('public'),
  bodyParser.urlencoded({ extended: true }),
  bodyParser.json(),
  session({
    cookie: sessCookies,
    name: 'sessionId',
    resave: false,
    saveUninitialized: true,
    secret: process.env.APP_SECRET
  }),
  require('./middlewares/flash.middleware.js')
];

app.use(middlewares);
app.set('view engine', 'pug');

app.locals = {
  PUGIN_VERSION: '1.11.8',
  SITE_TITLE: 'Email subscriptions - UK Parliament'
}

const routes = require('./routes/app.routes.js')(app);

app.listen(3000, () => console.log('App running on :3000'));
