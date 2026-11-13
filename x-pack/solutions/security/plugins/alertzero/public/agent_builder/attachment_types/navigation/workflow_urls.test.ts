/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { buildWorkflowExecutionUrl } from './workflow_urls';

describe('buildWorkflowExecutionUrl', () => {
  it('builds a Workflows executions deep-link for the managed worker workflow', () => {
    const getUrlForApp = jest.fn().mockReturnValue('/app/workflows/wf?tab=executions');

    const href = buildWorkflowExecutionUrl({
      getUrlForApp,
      workerId: 'system-security-hunt-continuous-threat-hunt',
      spaceId: 'default',
      executionId: 'run-abc',
    });

    expect(getUrlForApp).toHaveBeenCalledWith(WORKFLOWS_APP_ID, {
      path: '/system-security-hunt-continuous-threat-hunt-default?tab=executions&executionId=run-abc',
    });
    expect(href).toBe('/app/workflows/wf?tab=executions');
  });

  it('returns undefined when getUrlForApp is missing', () => {
    expect(
      buildWorkflowExecutionUrl({
        workerId: 'worker-1',
        spaceId: 'default',
        executionId: 'run-1',
      })
    ).toBeUndefined();
  });
});
