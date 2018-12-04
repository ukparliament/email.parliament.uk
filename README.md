# email.parliament.uk
[email.parliament.uk][email] is currently a prototype for providing users a branded, mixed-resource service to change their email subscription preferences from UK Parliament. It is designed to work with the [RSS Notification Service][rns].

[![License][shield-license]][info-license]

## Resources
[email.parliament.uk][email] uses [MailChimp][mailchimp] and [DynamoDB][ddb] to populate the subscription centre with things to subscribe to.

## Requirements
[email.parliament.uk][email] requires the following:
* [NodeJS][node]
* [NPM][npm]
* [MailChimp][mailchimp] API key
* An [AWS][aws] account, specifically with [DynamoDB][ddb], with an [AWS profile configured][aws_configure_setup] on your local machine

For local development, it is also useful to have:
* [DynamoDB local][ddbl], populated via [RSS Notification Service][rns]
* [DynamoDB admin][ddba]

## Setup
You will need to setup environment variables with your own details. The following are required:
```bash
export AWS_DYNAMODB_ENDPOINT=
export AWS_DYNAMODB_REGION=
export MC_API_KEY=
```

Defaults:
```
AWS_DYNAMODB_ENDPOINT: http://localhost:8000
AWS_DYNAMODB_REGION: local
```

`MC_API_KEY` does not have a default and the application will fail if it tries to connect to MailChimp without an API key present.

## Quick Start
```bash
git clone https://github.com/ukparliament/email.parliament.uk.git
cd email.parliament.uk
npm install && npm start
```

## Contributing
If you wish to submit a bug fix or feature, you can create a pull request and it will be merged pending a code review.

1. Fork the repository
1. Create your feature branch (`git checkout -b my-new-feature`)
1. Commit your changes (`git commit -am 'Add some feature'`)
1. Push to the branch (`git push origin my-new-feature`)
1. Create a new Pull Request

## License
[email.parliament.uk][email] is licensed under the [MIT][info-license].

[email]: https://email.parliament.uk
[rns]: https://github.com/ukparliament/rss-notification-service
[node]: https://nodejs.org/
[npm]: https://www.npmjs.com/
[aws]: https://aws.amazon.com/
[aws_configure_setup]: https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html
[mailchimp]: https://mailchimp.com
[ddb]: https://aws.amazon.com/dynamodb/
[ddbl]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html
[ddba]: https://github.com/aaronshaf/dynamodb-admin

[info-license]:   https://github.com/ukparliament/email.parliament.uk/blob/master/LICENSE
[shield-license]: https://img.shields.io/badge/license-MIT-blue.svg
