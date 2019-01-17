const Joi = require('joi');

const fields = {
  skipCreatedBefore: Joi.alternatives()
    .try(Joi.string(), Joi.boolean().only(false))
    .description(
      'Skip issues and pull requests created before a given timestamp. Timestamp ' +
        'must follow ISO 8601 (`YYYY-MM-DD`). Set to `false` to disable'
    ),

  comment: Joi.alternatives()
    .try(Joi.string(), Joi.boolean().only(false))
    .description(
      'Comment to post before closing or locking. Set to `false` to disable'
    ),

  label: Joi.alternatives()
    .try(Joi.string(), Joi.boolean().only(false))
    .description(
      'Label to add before closing or locking. Set to `false` to disable'
    ),

  close: Joi.boolean().description('Close issues and pull requests'),

  lock: Joi.boolean().description('Lock issues and pull requests')
};

const schema = Joi.object().keys({
  skipCreatedBefore: fields.skipCreatedBefore.default(false),
  comment: fields.comment.default(false),
  label: fields.label.default(false),
  close: fields.close.default(true),
  lock: fields.lock.default(true),
  only: Joi.string()
    .valid('issues', 'pulls')
    .description('Limit to only `issues` or `pulls`'),
  pulls: Joi.object().keys(fields),
  issues: Joi.object().keys(fields),
  _extends: Joi.string().description('Repository to extend settings from'),
  perform: Joi.boolean().default(!process.env.DRY_RUN)
});

module.exports = schema;
