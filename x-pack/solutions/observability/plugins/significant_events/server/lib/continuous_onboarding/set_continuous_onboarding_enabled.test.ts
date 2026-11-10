/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import { OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED } from '@kbn/management-settings-ids';
import type { ContinuousOnboardingWorkflowService } from '../workflows/continuous_onboarding_workflow';
import { setContinuousOnboardingEnabled } from './set_continuous_onboarding_enabled';

const request = { spaceId: 'space-1' } as KibanaRequest;

const setup = (previousEnabled: boolean) => {
  const calls: string[] = [];
  const uiSettingsClient = {
    get: jest.fn().mockResolvedValue(previousEnabled),
    set: jest.fn(async () => {
      calls.push('set');
    }),
  } as unknown as jest.Mocked<IUiSettingsClient>;
  const workflowService: jest.Mocked<ContinuousOnboardingWorkflowService> = {
    ensureWorkflow: jest.fn(
      async (_params: Parameters<ContinuousOnboardingWorkflowService['ensureWorkflow']>[0]) => {
        calls.push('ensureWorkflow');
      }
    ),
  };
  const logger = {
    warn: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  const run = (enabled: boolean) =>
    setContinuousOnboardingEnabled({
      uiSettingsClient,
      workflowService,
      request,
      spaceId: request.spaceId,
      enabled,
      logger,
    });

  return { calls, logger, run, uiSettingsClient, workflowService };
};

describe('setContinuousOnboardingEnabled', () => {
  it('does nothing when the setting already has the target value', async () => {
    const { run, uiSettingsClient, workflowService } = setup(true);

    await run(true);

    expect(uiSettingsClient.get).toHaveBeenCalledWith(
      OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED
    );
    expect(uiSettingsClient.set).not.toHaveBeenCalled();
    expect(workflowService.ensureWorkflow).not.toHaveBeenCalled();
  });

  it('sets the value before reconciling the workflow', async () => {
    const { calls, run, uiSettingsClient, workflowService } = setup(false);

    await run(true);

    expect(calls).toEqual(['set', 'ensureWorkflow']);
    expect(uiSettingsClient.set).toHaveBeenCalledWith(
      OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
      true
    );
    expect(workflowService.ensureWorkflow).toHaveBeenCalledWith({
      enabled: true,
      request,
      spaceId: request.spaceId,
    });
  });

  it('restores the setting when workflow reconciliation fails', async () => {
    const { logger, run, uiSettingsClient, workflowService } = setup(false);
    const error = new Error('workflow unavailable');
    workflowService.ensureWorkflow.mockRejectedValue(error);

    await expect(run(true)).rejects.toBe(error);

    expect(uiSettingsClient.set).toHaveBeenNthCalledWith(
      1,
      OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
      true
    );
    expect(uiSettingsClient.set).toHaveBeenNthCalledWith(
      2,
      OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
      false
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
