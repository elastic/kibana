/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default async ({ readConfigFile }) => {
  const baseConfigs = await readConfigFile(
    require.resolve('./config.stack_functional_integration_base.js')
  );
  return {
    ...baseConfigs.getAll(),
    browser: {
      type: 'ie',
    },
    security: { disableTestUser: true },
  };
};
