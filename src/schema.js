const Joi = require('@hapi/joi');

const fields = {
  skipCreatedBefore: Joi.alternatives()
    .try(
      Joi.date()
        .iso()
        .min('1970-01-01T00:00:00Z')
        .max('2970-12-31T23:59:59Z'),
      Joi.boolean().only(false)
    )
    .description(
      'Skip issues and pull requests created before a given timestamp. Timestamp ' +
        'must follow ISO 8601 (`YYYY-MM-DD`). Set to `false` to disable'
    ),

  exemptLabels: Joi.array()
    .single()
    .items(
      Joi.string()
        .trim()
        .max(50)
    )
    .description(
      'Issues and pull requests with these labels will be ignored. Set to `[]` to disable'
    ),

  comment: Joi.alternatives()
    .try(
      Joi.string()
        .trim()
        .max(10000),
      Joi.boolean().only(false)
    )
    .description(
      'Comment to post before closing or locking. Set to `false` to disable'
    ),

  label: Joi.alternatives()
    .try(
      Joi.string()
        .trim()
        .max(50),
      Joi.boolean().only(false)
    )
    .description(
      'Label to add before closing or locking. Set to `false` to disable'
    ),

  close: Joi.boolean().description('Close issues and pull requests'),

  lock: Joi.boolean().description('Lock issues and pull requests')
};

const schema = Joi.object().keys({
  skipCreatedBefore: fields.skipCreatedBefore.default(false),
  exemptLabels: fields.exemptLabels.default([]),
  comment: fields.comment.default(false),
  label: fields.label.default(false),
  close: fields.close.default(true),
  lock: fields.lock.default(true),
  only: Joi.string()
    .trim()
    .valid('issues', 'pulls')
    .description('Limit to only `issues` or `pulls`'),
  pulls: Joi.object().keys(fields),
  issues: Joi.object().keys(fields),
  _extends: Joi.string()
    .trim()
    .max(260)
    .description('Repository to extend settings from'),
  perform: Joi.boolean().default(!process.env.DRY_RUN)
});

module.exports = schema;
