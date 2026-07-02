/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { SECURITY_ALERT_VALIDATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  INITIALIZATION_FLOW_INIT_ALERT_VALIDATION_WORKFLOW,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext } from '../../types';
import {
  initAlertValidationWorkflowFlow,
  registerInitAlertValidationWorkflowFlowDependencies,
} from '.';

const createManagedWorkflowsClient = () => ({
  install: jest.fn().mockResolvedValue(undefined),
  uninstall: jest.fn().mockResolvedValue(undefined),
  ready: jest.fn().mockResolvedValue(undefined),
  getWorkflowStatus: jest.fn().mockResolvedValue({ status: 'missing' }),
  execute: jest.fn().mockResolvedValue('mock-execution-id'),
});

describe('initAlertValidationWorkflowFlow', () => {
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let uiSettingsClient: { get: jest.Mock };
  let managedWorkflowsClient: ReturnType<typeof createManagedWorkflowsClient>;
  let workflowsExtensions: ReturnType<typeof workflowsExtensionsMock.createStart> | undefined;

  const createContext = (): InitializationFlowContext =>
    ({
      requestHandlerContext: {
        securitySolution: Promise.resolve({ getSpaceId: () => 'space-1' }),
        core: Promise.resolve({ uiSettings: { client: uiSettingsClient } }),
      },
      logger: loggerMock.create(),
    } as unknown as InitializationFlowContext);

  beforeEach(() => {
    coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(true);
    uiSettingsClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce(true) // workflowEnabled
        .mockResolvedValueOnce(true) // autoCloseEnabled
        .mockResolvedValueOnce(0.85) // autoCloseConfidenceScoreMinThreshold
        .mockResolvedValueOnce(1) // autoCloseConfidenceScoreMaxThreshold
        .mockResolvedValueOnce('') // connectorId
        .mockResolvedValueOnce(true), // createConversation
    };
    managedWorkflowsClient = createManagedWorkflowsClient();
    workflowsExtensions = workflowsExtensionsMock.createStart();
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managedWorkflowsClient);

    registerInitAlertValidationWorkflowFlowDependencies({
      getStartServices: jest
        .fn()
        .mockResolvedValue([coreStart, { workflowsExtensions }, undefined]),
    } as never);
  });

  it('has the correct id and is space-aware', () => {
    expect(initAlertValidationWorkflowFlow.id).toBe(
      INITIALIZATION_FLOW_INIT_ALERT_VALIDATION_WORKFLOW
    );
    expect(initAlertValidationWorkflowFlow.spaceAware).toBe(true);
  });

  it('installs the workflow for the space when it is missing', async () => {
    const result = await initAlertValidationWorkflowFlow.runFlow(createContext());

    expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
      SECURITY_ALERT_VALIDATION_WORKFLOW_ID,
      {
        spaceId: 'space-1',
        workflowIdSuffix: 'space-1',
        values: {
          workflowEnabled: true,
          autoCloseEnabled: true,
          autoCloseConfidenceScoreMinThreshold: 0.85,
          autoCloseConfidenceScoreMaxThreshold: 1,
          connectorId: '',
          createConversation: true,
        },
      }
    );
    expect(result).toEqual({ status: INITIALIZATION_FLOW_STATUS_READY, payload: null });
  });

  it('does not reinstall the workflow when it is already installed', async () => {
    managedWorkflowsClient.getWorkflowStatus.mockResolvedValue({ status: 'intact' });

    await initAlertValidationWorkflowFlow.runFlow(createContext());

    expect(managedWorkflowsClient.install).not.toHaveBeenCalled();
  });

  it('does nothing when the feature flag is disabled', async () => {
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(false);

    const result = await initAlertValidationWorkflowFlow.runFlow(createContext());

    expect(managedWorkflowsClient.install).not.toHaveBeenCalled();
    expect(result).toEqual({ status: INITIALIZATION_FLOW_STATUS_READY, payload: null });
  });

  it('does nothing when workflowsExtensions is unavailable', async () => {
    registerInitAlertValidationWorkflowFlowDependencies({
      getStartServices: jest.fn().mockResolvedValue([coreStart, {}, undefined]),
    } as never);

    const result = await initAlertValidationWorkflowFlow.runFlow(createContext());

    expect(uiSettingsClient.get).not.toHaveBeenCalled();
    expect(result).toEqual({ status: INITIALIZATION_FLOW_STATUS_READY, payload: null });
  });
});
