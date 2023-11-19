import Joi from 'joi';

const extendedJoi = Joi.extend(joi => {
  return {
    type: 'stringList',
    base: joi.array(),
    coerce: {
      from: 'string',
      method(value) {
        value = value.trim();
        if (value) {
          value = value
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
        }

        return {value};
      }
    }
  };
}).extend(joi => {
  return {
    type: 'processOnly',
    base: joi.string(),
    coerce: {
      from: 'string',
      method(value) {
        value = value.trim();
        if (['issues', 'prs'].includes(value)) {
          value = value.slice(0, -1);
        }

        return {value};
      }
    }
  };
});

const schema = Joi.object({
  'github-token': Joi.string().trim().max(100),

  'exclude-issue-created-before': Joi.alternatives()
    .try(
      Joi.date()
        // .iso()
        .min('1970-01-01T00:00:00Z')
        .max('2970-12-31T23:59:59Z'),
      Joi.string().trim().valid('')
    )
    .default(''),

  'exclude-issue-labels': Joi.alternatives()
    .try(
      extendedJoi
        .stringList()
        .items(Joi.string().trim().max(50))
        .min(1)
        .max(30)
        .unique(),
      Joi.string().trim().valid('')
    )
    .default(''),

  'issue-labels': Joi.alternatives()
    .try(
      extendedJoi
        .stringList()
        .items(Joi.string().trim().max(50))
        .min(1)
        .max(30)
        .unique(),
      Joi.string().trim().valid('')
    )
    .default(''),

  'issue-comment': Joi.string().trim().max(10000).allow('').default(''),

  'skip-closed-issue-comment': Joi.boolean().default(false),

  'close-issue': Joi.boolean()
    .default(true)
    .error(
      new Error(
        '"close-issue" must be a boolean, either "close-issue" or "lock-issue" must be "true"'
      )
    ),

  'lock-issue': Joi.boolean()
    .when('close-issue', {
      is: Joi.boolean().valid(false),
      then: Joi.boolean().valid(true)
    })
    .default(true)
    .error(
      new Error(
        '"lock-issue" must be a boolean, either "close-issue" or "lock-issue" must be "true"'
      )
    ),

  'issue-lock-reason': Joi.string()
    .valid('resolved', 'off-topic', 'too heated', 'spam', '')
    .default('resolved'),

  'exclude-pr-created-before': Joi.alternatives()
    .try(
      Joi.date()
        // .iso()
        .min('1970-01-01T00:00:00Z')
        .max('2970-12-31T23:59:59Z'),
      Joi.string().trim().valid('')
    )
    .default(''),

  'exclude-pr-labels': Joi.alternatives()
    .try(
      extendedJoi
        .stringList()
        .items(Joi.string().trim().max(50))
        .min(1)
        .max(30)
        .unique(),
      Joi.string().trim().valid('')
    )
    .default(''),

  'pr-labels': Joi.alternatives()
    .try(
      extendedJoi
        .stringList()
        .items(Joi.string().trim().max(50))
        .min(1)
        .max(30)
        .unique(),
      Joi.string().trim().valid('')
    )
    .default(''),

  'pr-comment': Joi.string().trim().max(10000).allow('').default(''),

  'skip-closed-pr-comment': Joi.boolean().default(false),

  'close-pr': Joi.boolean()
    .default(true)
    .error(
      new Error(
        '"close-pr" must be a boolean, either "close-pr" or "lock-pr" must be "true"'
      )
    ),

  'lock-pr': Joi.boolean()
    .when('close-pr', {
      is: Joi.boolean().valid(false),
      then: Joi.boolean().valid(true)
    })
    .default(true)
    .error(
      new Error(
        '"lock-pr" must be a boolean, either "pr-close" or "lock-pr" must be "true"'
      )
    ),

  'pr-lock-reason': Joi.string()
    .valid('resolved', 'off-topic', 'too heated', 'spam', '')
    .default('resolved'),

  'process-only': extendedJoi
    .processOnly()
    .valid('issue', 'pr', '')
    .default(''),

  'log-output': Joi.boolean().default(false)
});

export {schema};
