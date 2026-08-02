/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_DEEP_ID } from '@kbn/pnd-common';
import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';
import { resolveRespondTarget } from '.';

const parsed = {
  stepExecutionId: 'step-exec-1',
  workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  workflowRunId: 'run-1',
};

const execution = (overrides = {}) => ({
  context: {},
  id: 'run-1',
  stepExecutions: [
    { id: 'step-exec-1', status: 'waiting_for_input', stepId: 'await_open_investigation' },
  ],
  workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  ...overrides,
});

const createManagementClient = (execResult: unknown) =>
  ({
    getWorkflowExecution: jest.fn().mockResolvedValue(execResult),
  } as unknown as WatchWorkflowsManagementClient);

describe('resolveRespondTarget', () => {
  it('resolves a pending PND gate to ok with its registry definition', async () => {
    const result = await resolveRespondTarget({
      managementClient: createManagementClient(execution()),
      parsed,
      spaceId: 'agent-3',
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'ok',
        stepExecutionId: 'step-exec-1',
        workflowRunId: 'run-1',
      })
    );
  });

  it('surfaces the execution context.event on the ok result (for pnd.incidentClosed emission)', async () => {
    const event = { correlationId: 'ad-1' };
    const result = await resolveRespondTarget({
      managementClient: createManagementClient(execution({ context: { event } })),
      parsed,
      spaceId: 'agent-3',
    });

    expect(result).toEqual(expect.objectContaining({ status: 'ok', event }));
  });

  it('fetches the execution scoped to the resolved space (S9/C7)', async () => {
    const managementClient = createManagementClient(execution());

    await resolveRespondTarget({ managementClient, parsed, spaceId: 'agent-3' });

    expect(managementClient.getWorkflowExecution).toHaveBeenCalledWith('run-1', 'agent-3');
  });

  it('returns not_found when the execution is absent (wrong space or missing)', async () => {
    const result = await resolveRespondTarget({
      managementClient: createManagementClient(null),
      parsed,
      spaceId: 'agent-3',
    });

    expect(result.status).toEqual('not_found');
  });

  it('rejects a run that belongs to a non-PND workflow even if the source id claims PND (S1)', async () => {
    const result = await resolveRespondTarget({
      managementClient: createManagementClient(execution({ workflowId: 'some-other-workflow' })),
      parsed,
      spaceId: 'agent-3',
    });

    expect(result.status).toEqual('forbidden_workflow');
  });

  it('returns not_found when the step execution id is not in the run', async () => {
    const result = await resolveRespondTarget({
      managementClient: createManagementClient(
        execution({
          stepExecutions: [
            {
              id: 'a-different-step',
              status: 'waiting_for_input',
              stepId: 'await_open_investigation',
            },
          ],
        })
      ),
      parsed,
      spaceId: 'agent-3',
    });

    expect(result.status).toEqual('not_found');
  });

  it('rejects a step whose stepId is not a registered gate', async () => {
    const result = await resolveRespondTarget({
      managementClient: createManagementClient(
        execution({
          stepExecutions: [
            { id: 'step-exec-1', status: 'waiting_for_input', stepId: 'not_a_gate' },
          ],
        })
      ),
      parsed,
      spaceId: 'agent-3',
    });

    expect(result.status).toEqual('unknown_gate');
  });

  it('rejects a step that is no longer waiting for input', async () => {
    const result = await resolveRespondTarget({
      managementClient: createManagementClient(
        execution({
          stepExecutions: [
            { id: 'step-exec-1', status: 'completed', stepId: 'await_open_investigation' },
          ],
        })
      ),
      parsed,
      spaceId: 'agent-3',
    });

    expect(result.status).toEqual('not_pending');
  });
});
