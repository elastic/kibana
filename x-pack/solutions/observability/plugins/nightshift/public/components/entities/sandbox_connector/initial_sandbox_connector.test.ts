/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TEST_CONNECTOR_SUB_ACTION } from '@kbn/connector-specs';
import { getInitialSandboxConnector } from './initial_sandbox_connector';

describe('getInitialSandboxConnector', () => {
  it('limits spec connectors to the test sub-action', () => {
    expect(getInitialSandboxConnector({ id: '.github', source: 'spec' })).toEqual({
      actionTypeId: '.github',
      config: { selectedActions: [TEST_CONNECTOR_SUB_ACTION] },
    });
  });

  it.each([
    ['stack', 'stack' as const],
    ['yml', 'yml' as const],
    ['unset', undefined],
  ])('leaves the config unset for %s connector types', (_label, source) => {
    expect(getInitialSandboxConnector({ id: '.http', source })).toEqual({ actionTypeId: '.http' });
  });
});
