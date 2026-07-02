/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ALERT_VALIDATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { APP_ID } from '../../common/constants';
import {
  ensureSecurityAlertValidationWorkflowInstalled,
  getAllSpaceIds,
  getSecurityAlertValidationWorkflowIdForSpace,
  initSecurityManagedWorkflowsClient,
  installSecurityAlertValidationWorkflow,
  installSecurityAlertValidationWorkflowForAllSpaces,
  markSecurityManagedWorkflowsReady,
  readSecurityAlertValidationWorkflowSettings,
  readSecurityAlertValidationWorkflowSettingsForSpace,
  registerSecurityManagedWorkflowOwner,
} from './managed_workflows';

const settings = {
  workflowEnabled: true,
  autoCloseEnabled: true,
  autoCloseConfidenceScoreMinThreshold: 0.8,
  autoCloseConfidenceScoreMaxThreshold: 0.95,
  connectorId: '',
  createConversation: true,
};

describe('managed workflows', () => {
  const createManagedClient = () => ({
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    ready: jest.fn().mockResolvedValue(undefined),
    getWorkflowStatus: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue('execution-id'),
  });

  it('registers Security Solution as a managed workflow owner', () => {
    const workflowsExtensions = workflowsExtensionsMock.createSetup();

    registerSecurityManagedWorkflowOwner(workflowsExtensions);

    expect(workflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledWith(APP_ID);
  });

  it('initializes the Security-scoped managed workflows client', async () => {
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    const managed = createManagedClient();

    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);

    await initSecurityManagedWorkflowsClient(workflowsExtensions);

    expect(workflowsExtensions.initManagedWorkflowsClient).toHaveBeenCalledWith(APP_ID);
  });

  it('installs the per-space alert validation workflow with template values', async () => {
    const managed = createManagedClient();

    await installSecurityAlertValidationWorkflow({
      managedWorkflowsClient: managed,
      spaceId: 'security',
      settings,
    });

    expect(managed.install).toHaveBeenCalledWith(SECURITY_ALERT_VALIDATION_WORKFLOW_ID, {
      spaceId: 'security',
      workflowIdSuffix: 'security',
      values: settings,
    });
    expect(managed.ready).not.toHaveBeenCalled();
  });

  it('builds the per-space alert validation workflow id from the managed id and space id', () => {
    expect(getSecurityAlertValidationWorkflowIdForSpace('security')).toBe(
      'system-security-alert-validation-security'
    );
  });

  it('marks Security managed workflows ready without installing workflows', async () => {
    const workflowsExtensions = workflowsExtensionsMock.createStart();
    const managed = createManagedClient();

    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);

    await markSecurityManagedWorkflowsReady({
      workflowsExtensions,
      logger: loggerMock.create(),
    });

    expect(managed.ready).toHaveBeenCalledTimes(1);
    expect(managed.install).not.toHaveBeenCalled();
  });

  describe('readSecurityAlertValidationWorkflowSettings', () => {
    it('reads the six settings from the given uiSettings client', async () => {
      const uiSettingsClient = {
        get: jest
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(0.8)
          .mockResolvedValueOnce(0.95)
          .mockResolvedValueOnce('connector-abc')
          .mockResolvedValueOnce(false),
      };

      const result = await readSecurityAlertValidationWorkflowSettings(uiSettingsClient);

      expect(result).toEqual({
        workflowEnabled: true,
        autoCloseEnabled: true,
        autoCloseConfidenceScoreMinThreshold: 0.8,
        autoCloseConfidenceScoreMaxThreshold: 0.95,
        connectorId: 'connector-abc',
        createConversation: false,
      });
    });
  });

  describe('readSecurityAlertValidationWorkflowSettingsForSpace', () => {
    it('reads settings via a namespace-scoped internal Saved Objects client', async () => {
      const coreStart = coreMock.createStart();
      const uiSettingsClient = {
        get: jest
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(0.8)
          .mockResolvedValueOnce(0.95)
          .mockResolvedValueOnce('')
          .mockResolvedValueOnce(true),
      };
      (coreStart.uiSettings.asScopedToClient as jest.Mock).mockReturnValue(uiSettingsClient);

      const result = await readSecurityAlertValidationWorkflowSettingsForSpace({
        coreStart,
        spaceId: 'my-space',
      });

      expect(coreStart.savedObjects.getUnsafeInternalClient).toHaveBeenCalled();
      expect(result).toEqual(settings);
    });
  });

  describe('getAllSpaceIds', () => {
    it('always includes the default space and pages through the space saved objects', async () => {
      const coreStart = coreMock.createStart();
      const spaceRepo = coreStart.savedObjects.createInternalRepository(['space']);
      (spaceRepo.find as jest.Mock).mockResolvedValueOnce({
        saved_objects: [{ id: 'security' }],
      });

      const spaceIds = await getAllSpaceIds(coreStart);

      expect(spaceIds).toEqual(['default', 'security']);
    });
  });

  describe('ensureSecurityAlertValidationWorkflowInstalled', () => {
    it('installs the workflow when it is missing', async () => {
      const managed = createManagedClient();
      managed.getWorkflowStatus.mockResolvedValue({ status: 'missing' });

      await ensureSecurityAlertValidationWorkflowInstalled({
        managedWorkflowsClient: managed,
        spaceId: 'security',
        settings,
      });

      expect(managed.install).toHaveBeenCalledWith(SECURITY_ALERT_VALIDATION_WORKFLOW_ID, {
        spaceId: 'security',
        workflowIdSuffix: 'security',
        values: settings,
      });
    });

    it('does not reinstall the workflow when it is already installed', async () => {
      const managed = createManagedClient();
      managed.getWorkflowStatus.mockResolvedValue({ status: 'disabled' });

      await ensureSecurityAlertValidationWorkflowInstalled({
        managedWorkflowsClient: managed,
        spaceId: 'security',
        settings,
      });

      expect(managed.install).not.toHaveBeenCalled();
    });
  });

  describe('installSecurityAlertValidationWorkflowForAllSpaces', () => {
    const setUpSingleSpace = (uiSettingsClient: { get: jest.Mock }) => {
      const coreStart = coreMock.createStart();
      // Only the default space; no extra `space` saved objects.
      const spaceRepo = coreStart.savedObjects.createInternalRepository(['space']);
      (spaceRepo.find as jest.Mock).mockResolvedValue({ saved_objects: [] });
      (coreStart.uiSettings.asScopedToClient as jest.Mock).mockReturnValue(uiSettingsClient);
      return coreStart;
    };

    it('installs the workflow for the default space when it is missing', async () => {
      const uiSettingsClient = {
        get: jest
          .fn()
          .mockResolvedValueOnce(settings.workflowEnabled)
          .mockResolvedValueOnce(settings.autoCloseEnabled)
          .mockResolvedValueOnce(settings.autoCloseConfidenceScoreMinThreshold)
          .mockResolvedValueOnce(settings.autoCloseConfidenceScoreMaxThreshold)
          .mockResolvedValueOnce(settings.connectorId)
          .mockResolvedValueOnce(settings.createConversation),
      };
      const coreStart = setUpSingleSpace(uiSettingsClient);

      const workflowsExtensions = workflowsExtensionsMock.createStart();
      const managed = createManagedClient();
      managed.getWorkflowStatus.mockResolvedValue({ status: 'missing' });
      workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);

      await installSecurityAlertValidationWorkflowForAllSpaces({
        coreStart,
        workflowsExtensions,
        logger: loggerMock.create(),
      });

      expect(managed.install).toHaveBeenCalledWith(SECURITY_ALERT_VALIDATION_WORKFLOW_ID, {
        spaceId: 'default',
        workflowIdSuffix: 'default',
        values: settings,
      });
    });

    it('logs a warning and does not throw when a space fails to install', async () => {
      const uiSettingsClient = { get: jest.fn().mockResolvedValue(true) };
      const coreStart = setUpSingleSpace(uiSettingsClient);

      const workflowsExtensions = workflowsExtensionsMock.createStart();
      const managed = createManagedClient();
      managed.getWorkflowStatus.mockRejectedValue(new Error('boom'));
      workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);
      const logger = loggerMock.create();

      await expect(
        installSecurityAlertValidationWorkflowForAllSpaces({
          coreStart,
          workflowsExtensions,
          logger,
        })
      ).resolves.not.toThrow();

      expect(managed.install).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('default'),
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });
});
