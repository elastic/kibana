/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { createKbnVitestConfig } = require('@kbn/test/vitest/preset');

module.exports = createKbnVitestConfig({
  environment: 'jsdom',
  roots: ['x-pack/solutions/security/plugins/security_solution/public/asset_inventory'],
  aliases: [
    {
      find: /^@kbn\/core\/server$/,
      replacement:
        'x-pack/solutions/security/plugins/security_solution/server/__mocks__/core.mock.ts',
    },
    {
      find: /^@kbn\/task-manager-plugin\/server$/,
      replacement:
        'x-pack/solutions/security/plugins/security_solution/server/__mocks__/task_manager.mock.ts',
    },
    {
      find: /^@kbn\/alerting-plugin\/server$/,
      replacement:
        'x-pack/solutions/security/plugins/security_solution/server/__mocks__/alert.mock.ts',
    },
    {
      find: /^@kbn\/actions-plugin\/server$/,
      replacement:
        'x-pack/solutions/security/plugins/security_solution/server/__mocks__/action.mock.ts',
    },
  ],
});
