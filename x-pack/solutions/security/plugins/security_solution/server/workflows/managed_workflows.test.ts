/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { SECURITY_ALERT_VALIDATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import {
  APP_ID,
  MANAGED_ALERT_VALIDATION_WORKFLOW_FEATURE_FLAG,
  MANAGED_ALERT_VALIDATION_WORKFLOW_FEATURE_FLAG_DEFAULT,
} from '../../common/constants';
import {
  installSecurityManagedWorkflows,
  registerSecurityManagedWorkflowOwner,
} from './managed_workflows';

describe('managed workflows', () => {
  const createManagedClient = () => ({
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    ready: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue('execution-id'),
  });

  it('registers Security Solution as a managed workflow owner', () => {
    const workflowsExtensions = workflowsExtensionsMock.createSetup();

    registerSecurityManagedWorkflowOwner(workflowsExtensions);

    expect(workflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledWith(APP_ID);
  });

  it('skips installation when the managed alert validation workflow flag is disabled', async () => {
    const core = coreMock.createStart();
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    const logger = loggerMock.create();

    core.featureFlags.getBooleanValue.mockResolvedValue(false);

    await installSecurityManagedWorkflows({ core, workflowsExtensions, logger });

    expect(core.featureFlags.getBooleanValue).toHaveBeenCalledWith(
      MANAGED_ALERT_VALIDATION_WORKFLOW_FEATURE_FLAG,
      MANAGED_ALERT_VALIDATION_WORKFLOW_FEATURE_FLAG_DEFAULT
    );
    expect(workflowsExtensions.initManagedWorkflowsClient).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Security managed alert validation workflow installation is disabled'
    );
  });

  it('installs the global alert validation workflow and marks the plugin ready', async () => {
    const core = coreMock.createStart();
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    const logger = loggerMock.create();
    const managed = createManagedClient();

    core.featureFlags.getBooleanValue.mockResolvedValue(true);
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);

    await installSecurityManagedWorkflows({ core, workflowsExtensions, logger });

    expect(workflowsExtensions.initManagedWorkflowsClient).toHaveBeenCalledWith(APP_ID);
    expect(managed.install).toHaveBeenCalledWith(SECURITY_ALERT_VALIDATION_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
    expect(managed.ready).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Security managed alert validation workflow installed successfully'
    );
  });

  it('logs installation failures without throwing', async () => {
    const core = coreMock.createStart();
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    const logger = loggerMock.create();
    const error = new Error('install failed');

    core.featureFlags.getBooleanValue.mockResolvedValue(true);
    workflowsExtensions.initManagedWorkflowsClient.mockRejectedValue(error);

    await expect(
      installSecurityManagedWorkflows({ core, workflowsExtensions, logger })
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to install Security managed alert validation workflow',
      { error }
    );
  });
});
