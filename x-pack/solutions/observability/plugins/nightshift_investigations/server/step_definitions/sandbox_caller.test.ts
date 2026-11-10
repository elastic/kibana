/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { getSandboxStepCaller } from './sandbox_caller';

describe('getSandboxStepCaller', () => {
  const getContext = () => ({ execution: { id: 'exec-1' } });

  it('names the step, the workflow run and the fake request the step runs with', () => {
    const request = { isFakeRequest: true } as unknown as KibanaRequest;

    expect(
      getSandboxStepCaller({
        stepId: 'obtain',
        stepType: 'nightshift.obtainSandbox',
        contextManager: { getContext, getFakeRequest: () => request },
      })
    ).toEqual({
      type: 'workflow_step',
      stepType: 'nightshift.obtainSandbox',
      stepId: 'obtain',
      workflowExecutionId: 'exec-1',
      request,
    });
  });

  it('has no request when the workflow has no fake request', () => {
    expect(
      getSandboxStepCaller({
        stepId: 'obtain',
        stepType: 'nightshift.obtainSandbox',
        contextManager: { getContext },
      })
    ).toMatchObject({ type: 'workflow_step', request: undefined });
  });
});
