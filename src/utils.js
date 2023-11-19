import core from '@actions/core';

import {schema} from './schema.js';

function getConfig() {
  const input = Object.fromEntries(
    Object.keys(schema.describe().keys).map(item => [item, core.getInput(item)])
  );

  const {error, value} = schema.validate(input, {abortEarly: false});
  if (error) {
    throw error;
  }

  return value;
}

export {getConfig};
