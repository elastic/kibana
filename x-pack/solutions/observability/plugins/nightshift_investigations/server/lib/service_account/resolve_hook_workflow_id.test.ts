/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { createResolveHookWorkflowId } from './resolve_hook_workflow_id';

const AGENT = 'kibana/nightshift_agent';
const ctx = { request: httpServerMock.createKibanaRequest(), spaceId: 'obs' };
const BOUND_OPTIMIZE = `${NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID}-bound-obs`;

const setup = ({
  enabled = true,
  entryPoint = { enabled: true, definition: { settings: { run_as: AGENT } } } as unknown,
  boundHook = { enabled: true, definition: { settings: { run_as: AGENT } } } as unknown,
  getWorkflowError,
}: {
  enabled?: boolean;
  entryPoint?: unknown;
  boundHook?: unknown;
  getWorkflowError?: Error;
} = {}) => {
  const getWorkflow = jest.fn(async (id: string) => {
    if (getWorkflowError) throw getWorkflowError;
    return id === BOUND_OPTIMIZE ? boundHook : entryPoint;
  });
  const resolve = createResolveHookWorkflowId({
    isServiceAccountExecutionEnabled: () => enabled,
    getWorkflowsManagement: () =>
      ({ management: { getWorkflow } } as unknown as WorkflowsServerPluginSetup),
    logger: loggingSystemMock.createLogger(),
  });
  return { resolve, getWorkflow };
};

describe('createResolveHookWorkflowId', () => {
  it("runs a hook through the space's bound entry point once the space is set up", async () => {
    const { resolve } = setup();
    await expect(resolve(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID, ctx)).resolves.toBe(BOUND_OPTIMIZE);
  });

  it.each([
    ['service accounts are off', { enabled: false }],
    ['the space has no entry point', { entryPoint: null }],
    [
      'the entry point is bound to another account',
      { entryPoint: { enabled: true, definition: { settings: { run_as: 'kibana/other' } } } },
    ],
    ['the bound hook is missing', { boundHook: null }],
    ['the setup cannot be read', { getWorkflowError: new Error('forbidden') }],
  ])('keeps the global hook when %s', async (_, options) => {
    const { resolve } = setup(options);
    await expect(resolve(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID, ctx)).resolves.toBe(
      NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID
    );
  });

  it('leaves workflows without a bound entry point alone', async () => {
    const { resolve, getWorkflow } = setup();
    await expect(resolve(NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID, ctx)).resolves.toBe(
      NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID
    );
    expect(getWorkflow).not.toHaveBeenCalled();
  });
});
