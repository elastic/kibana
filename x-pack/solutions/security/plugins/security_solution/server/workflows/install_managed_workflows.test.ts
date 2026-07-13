/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
  SECURITY_INVESTIGATE_RULES_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { allowedExperimentalValues } from '../../common/experimental_features';
import { installSecurityManagedWorkflowsAndMarkReady } from './install_managed_workflows';

describe('installSecurityManagedWorkflowsAndMarkReady', () => {
  const createManagedClient = () => ({
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    ready: jest.fn().mockResolvedValue(undefined),
    getWorkflowStatus: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue('execution-id'),
  });

  const setup = () => {
    const managed = createManagedClient();
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);
    return { managed, workflowsExtensions, logger: loggerMock.create() };
  };

  it('awaits the installs before marking managed workflows ready', async () => {
    const { managed, workflowsExtensions, logger } = setup();
    const order: string[] = [];
    managed.install.mockImplementation(async (id: string) => {
      order.push(`install:${id}`);
    });
    managed.ready.mockImplementation(async () => {
      order.push('ready');
    });

    await installSecurityManagedWorkflowsAndMarkReady({
      workflowsExtensions,
      logger,
      experimentalFeatures: { ...allowedExperimentalValues, investigateRuleSkill: true },
    });

    // ready() must run only after every install resolves, else it closes the startup window
    // and reconciles before the workflows are installed.
    expect(order).toEqual([
      `install:${SECURITY_ALERT_ANALYSIS_WORKFLOW_ID}`,
      `install:${SECURITY_INVESTIGATE_RULES_WORKFLOW_ID}`,
      'ready',
    ]);
    expect(managed.install).toHaveBeenCalledWith(SECURITY_INVESTIGATE_RULES_WORKFLOW_ID, {
      spaceId: DEFAULT_SPACE_ID,
    });
  });

  it('skips the investigate-rules workflow when the investigateRuleSkill flag is off', async () => {
    const { managed, workflowsExtensions, logger } = setup();

    await installSecurityManagedWorkflowsAndMarkReady({
      workflowsExtensions,
      logger,
      experimentalFeatures: { ...allowedExperimentalValues, investigateRuleSkill: false },
    });

    expect(managed.install).toHaveBeenCalledTimes(1);
    expect(managed.install).toHaveBeenCalledWith(SECURITY_ALERT_ANALYSIS_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
    expect(managed.install).not.toHaveBeenCalledWith(
      SECURITY_INVESTIGATE_RULES_WORKFLOW_ID,
      expect.anything()
    );
    expect(managed.ready).toHaveBeenCalled();
  });

  it('logs a warning and does not throw, and does not mark ready, when an install fails', async () => {
    const { managed, workflowsExtensions, logger } = setup();
    managed.install.mockRejectedValue(new Error('boom'));

    await expect(
      installSecurityManagedWorkflowsAndMarkReady({
        workflowsExtensions,
        logger,
        experimentalFeatures: { ...allowedExperimentalValues },
      })
    ).resolves.not.toThrow();

    expect(managed.ready).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to install security managed workflows'),
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
