/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  createOnboardingClient,
  OnboardingUnavailableError,
  OnboardingValidationError,
} from './onboarding_client';

const suggestion = {
  title: 'checkout 5xx spike',
  prompt: 'Why did checkout start returning 5xx in the last hour?',
  rationale: '5xx up 4x in the last hour',
  source: 'error_spike',
  severity: 'high',
};

const setup = ({
  executions = [],
  execution,
  workflow = { id: NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID, definition: {} },
  secretKeys = ['GITHUB_TOKEN'],
}: {
  secretKeys?: string[];
  executions?: Array<{ id: string }>;
  execution?: Record<string, unknown>;
  workflow?: Record<string, unknown> | null;
} = {}) => {
  const management = {
    getWorkflowExecutions: jest.fn().mockResolvedValue({ results: executions }),
    getWorkflowExecution: jest.fn().mockResolvedValue(execution),
    getWorkflow: jest.fn().mockResolvedValue(workflow),
    runWorkflow: jest.fn().mockResolvedValue('exec-2'),
  };
  const client = createOnboardingClient({
    getDeps: () => ({
      workflowsManagement: { management } as unknown as WorkflowsServerPluginSetup,
    }),
    listSandboxSecretKeys: jest.fn().mockResolvedValue(secretKeys),
    logger: loggingSystemMock.createLogger(),
  });
  return { client, management, request: httpServerMock.createKibanaRequest() };
};

describe('createOnboardingClient', () => {
  it('returns no execution before onboarding started', async () => {
    const { client, request } = setup();
    expect(await client.get(request)).toEqual({});
  });

  it("maps the space's latest execution and its suggestions", async () => {
    const { client, management, request } = setup({
      executions: [{ id: 'exec-1' }],
      execution: {
        id: 'exec-1',
        status: 'completed',
        startedAt: '2026-10-08T09:00:00.000Z',
        finishedAt: '2026-10-08T09:03:00.000Z',
        context: { output: { suggestions: [suggestion] } },
      },
    });

    expect(await client.get(request)).toEqual({
      execution: {
        execution_id: 'exec-1',
        status: 'succeeded',
        started_at: '2026-10-08T09:00:00.000Z',
        finished_at: '2026-10-08T09:03:00.000Z',
        error: undefined,
        suggestions: [suggestion],
      },
    });
    expect(management.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID,
        sortOrder: 'desc',
        size: 1,
      }),
      'default'
    );
  });

  it('reports a running execution without suggestions', async () => {
    const { client, request } = setup({
      executions: [{ id: 'exec-1' }],
      execution: { id: 'exec-1', status: 'running', finishedAt: undefined, context: {} },
    });

    expect((await client.get(request)).execution).toEqual(
      expect.objectContaining({ status: 'running', suggestions: undefined })
    );
  });

  it('starts the workflow without inputs', async () => {
    const { client, management, request } = setup();

    expect(await client.start(request)).toEqual({ execution_id: 'exec-2' });
    expect(management.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID }),
      'default',
      {},
      request,
      'nightshift-onboarding'
    );
  });

  it('refuses to start without a sandbox secret', async () => {
    const { client, management, request } = setup({ secretKeys: [] });
    await expect(client.start(request)).rejects.toBeInstanceOf(OnboardingValidationError);
    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('fails when the workflow is not installed', async () => {
    const { client, request } = setup({ workflow: null });
    await expect(client.start(request)).rejects.toBeInstanceOf(OnboardingUnavailableError);
  });
});
