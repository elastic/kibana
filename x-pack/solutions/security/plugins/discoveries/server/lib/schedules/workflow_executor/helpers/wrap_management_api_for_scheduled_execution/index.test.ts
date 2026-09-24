/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

import { SCHEDULED_WORKFLOW_TRIGGERED_BY, wrapManagementApiForScheduledExecution } from '.';

type ManagementApi = NonNullable<WorkflowsServerPluginSetup['management']>;

const buildManagementApi = (): ManagementApi =>
  ({
    getWorkflow: jest.fn().mockResolvedValue({ id: 'workflow-1' }),
    runWorkflow: jest.fn().mockResolvedValue('inline-run-id'),
    scheduleWorkflow: jest.fn().mockResolvedValue('scheduled-run-id'),
  } as unknown as ManagementApi);

describe('wrapManagementApiForScheduledExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates runWorkflow to scheduleWorkflow with a default triggeredBy', async () => {
    const management = buildManagementApi();
    const request = {} as Parameters<ManagementApi['runWorkflow']>[3];

    await wrapManagementApiForScheduledExecution(management).runWorkflow(
      { id: 'w1' } as Parameters<ManagementApi['runWorkflow']>[0],
      'default',
      { foo: 'bar' },
      request
    );

    expect(management.scheduleWorkflow).toHaveBeenCalledWith(
      { id: 'w1' },
      'default',
      { foo: 'bar' },
      request,
      SCHEDULED_WORKFLOW_TRIGGERED_BY
    );
  });

  it('does not execute runWorkflow inline', async () => {
    const management = buildManagementApi();

    await wrapManagementApiForScheduledExecution(management).runWorkflow(
      { id: 'w1' } as Parameters<ManagementApi['runWorkflow']>[0],
      'default',
      {},
      {} as Parameters<ManagementApi['runWorkflow']>[3]
    );

    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('returns the execution id resolved by scheduleWorkflow', async () => {
    const management = buildManagementApi();

    const result = await wrapManagementApiForScheduledExecution(management).runWorkflow(
      { id: 'w1' } as Parameters<ManagementApi['runWorkflow']>[0],
      'default',
      {},
      {} as Parameters<ManagementApi['runWorkflow']>[3]
    );

    expect(result).toBe('scheduled-run-id');
  });

  it('forwards an explicit triggeredBy to scheduleWorkflow', async () => {
    const management = buildManagementApi();
    const request = {} as Parameters<ManagementApi['runWorkflow']>[3];

    await wrapManagementApiForScheduledExecution(management).runWorkflow(
      { id: 'w1' } as Parameters<ManagementApi['runWorkflow']>[0],
      'default',
      {},
      request,
      'custom-trigger'
    );

    expect(management.scheduleWorkflow).toHaveBeenCalledWith(
      { id: 'w1' },
      'default',
      {},
      request,
      'custom-trigger'
    );
  });

  it('propagates errors thrown by scheduleWorkflow', async () => {
    const management = buildManagementApi();
    (management.scheduleWorkflow as jest.Mock).mockRejectedValue(new Error('boom'));

    await expect(
      wrapManagementApiForScheduledExecution(management).runWorkflow(
        { id: 'w1' } as Parameters<ManagementApi['runWorkflow']>[0],
        'default',
        {},
        {} as Parameters<ManagementApi['runWorkflow']>[3]
      )
    ).rejects.toThrow('boom');
  });

  it('delegates non-runWorkflow methods to the wrapped api unchanged', async () => {
    const management = buildManagementApi();

    await wrapManagementApiForScheduledExecution(management).getWorkflow('workflow-1', 'default');

    expect(management.getWorkflow).toHaveBeenCalledWith('workflow-1', 'default');
  });
});
