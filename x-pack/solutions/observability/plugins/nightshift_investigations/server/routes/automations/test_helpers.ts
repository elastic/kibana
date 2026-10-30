/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createRouteContext = () => ({
  core: Promise.resolve({
    savedObjects: {
      client: { getCurrentNamespace: jest.fn().mockReturnValue('default') },
    },
    security: {
      authc: { getCurrentUser: jest.fn().mockReturnValue({ username: 'alice' }) },
    },
  }),
  resolve: jest.fn(),
});

/** The service account service as the automation routes use it. */
export const createServiceAccountService = () => ({
  resolveAutomationRunAs: jest.fn().mockResolvedValue('kibana/nightshift_automations'),
  assertCanModifyBoundAutomations: jest.fn().mockResolvedValue(undefined),
});
