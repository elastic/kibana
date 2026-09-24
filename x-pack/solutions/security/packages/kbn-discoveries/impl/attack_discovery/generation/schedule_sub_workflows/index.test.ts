/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

import { PIPELINE_WORKFLOW_TRIGGERED_BY, scheduleSubWorkflows } from '.';

type ManagementApi = NonNullable<WorkflowsServerPluginSetup['management']>;

const buildManagementApi = (): ManagementApi =>
  ({
    getWorkflow: jest.fn().mockResolvedValue({ id: 'workflow-1' }),
    runWorkflow: jest.fn().mockResolvedValue('inline-run-id'),
    scheduleWorkflow: jest.fn().mockResolvedValue('scheduled-run-id'),
  } as unknown as ManagementApi);

const buildWorkflow = () => ({ id: 'w1' } as Parameters<ManagementApi['runWorkflow']>[0]);

const buildRequest = () => ({} as Parameters<ManagementApi['runWorkflow']>[3]);

describe('scheduleSubWorkflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates runWorkflow to scheduleWorkflow with a default triggeredBy', async () => {
    const management = buildManagementApi();
    const request = buildRequest();

    await scheduleSubWorkflows(management).runWorkflow(
      buildWorkflow(),
      'default',
      { foo: 'bar' },
      request
    );

    expect(management.scheduleWorkflow).toHaveBeenCalledWith(
      { id: 'w1' },
      'default',
      { foo: 'bar' },
      request,
      PIPELINE_WORKFLOW_TRIGGERED_BY
    );
  });

  it('defaults triggeredBy to the pipeline trigger, so runs are not labeled as scheduled', () => {
    expect(PIPELINE_WORKFLOW_TRIGGERED_BY).toEqual('attack-discovery-pipeline');
  });

  it('does not execute runWorkflow inline', async () => {
    const management = buildManagementApi();

    await scheduleSubWorkflows(management).runWorkflow(
      buildWorkflow(),
      'default',
      {},
      buildRequest()
    );

    expect(management.runWorkflow).not.toHaveBeenCalled();
  });

  it('returns the execution id resolved by scheduleWorkflow', async () => {
    const management = buildManagementApi();

    const result = await scheduleSubWorkflows(management).runWorkflow(
      buildWorkflow(),
      'default',
      {},
      buildRequest()
    );

    expect(result).toBe('scheduled-run-id');
  });

  it('forwards an explicit triggeredBy to scheduleWorkflow', async () => {
    const management = buildManagementApi();
    const request = buildRequest();

    await scheduleSubWorkflows(management).runWorkflow(
      buildWorkflow(),
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
      scheduleSubWorkflows(management).runWorkflow(buildWorkflow(), 'default', {}, buildRequest())
    ).rejects.toThrow('boom');
  });

  it('delegates non-runWorkflow methods to the wrapped api unchanged', async () => {
    const management = buildManagementApi();

    await scheduleSubWorkflows(management).getWorkflow('workflow-1', 'default');

    expect(management.getWorkflow).toHaveBeenCalledWith('workflow-1', 'default');
  });

  describe('when the api is already wrapped', () => {
    it('schedules the workflow exactly once', async () => {
      const management = buildManagementApi();

      await scheduleSubWorkflows(scheduleSubWorkflows(management)).runWorkflow(
        buildWorkflow(),
        'default',
        {},
        buildRequest()
      );

      expect(management.scheduleWorkflow).toHaveBeenCalledTimes(1);
    });

    it('still does not execute runWorkflow inline', async () => {
      const management = buildManagementApi();

      await scheduleSubWorkflows(scheduleSubWorkflows(management)).runWorkflow(
        buildWorkflow(),
        'default',
        {},
        buildRequest()
      );

      expect(management.runWorkflow).not.toHaveBeenCalled();
    });

    it('does not override a triggeredBy supplied by an inner layer', async () => {
      const management = buildManagementApi();
      const request = buildRequest();

      // The scheduled path applies its own wrapper, which supplies
      // `attack-discovery-scheduled`. Because no pipeline caller passes a
      // `triggeredBy`, that inner value is what reaches `scheduleWorkflow`, and an
      // outer wrapper must leave it alone. That is what keeps double-wrapping inert.
      await scheduleSubWorkflows(scheduleSubWorkflows(management)).runWorkflow(
        buildWorkflow(),
        'default',
        {},
        request,
        'attack-discovery-scheduled'
      );

      expect(management.scheduleWorkflow).toHaveBeenCalledWith(
        { id: 'w1' },
        'default',
        {},
        request,
        'attack-discovery-scheduled'
      );
    });
  });
});
