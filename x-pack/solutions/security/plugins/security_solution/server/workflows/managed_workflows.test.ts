/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ALERT_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { APP_ID } from '../../common/constants';
import {
  ensureSecurityAlertAnalysisWorkflowInstalled,
  getAllSpaceIds,
  getSecurityAlertAnalysisWorkflowIdForSpace,
  initSecurityManagedWorkflowsClient,
  installSecurityAlertAnalysisWorkflow,
  installSecurityAlertAnalysisWorkflowForAllSpaces,
  markSecurityManagedWorkflowsReady,
  readSecurityAlertAnalysisWorkflowSettings,
  readSecurityAlertAnalysisWorkflowSettingsForSpace,
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

  it('installs the per-space alert analysis workflow with template values', async () => {
    const managed = createManagedClient();

    await installSecurityAlertAnalysisWorkflow({
      managedWorkflowsClient: managed,
      spaceId: 'security',
      settings,
    });

    expect(managed.install).toHaveBeenCalledWith(SECURITY_ALERT_ANALYSIS_WORKFLOW_ID, {
      spaceId: 'security',
      workflowIdSuffix: 'security',
      values: settings,
    });
    expect(managed.ready).not.toHaveBeenCalled();
  });

  it('builds the per-space alert analysis workflow id from the managed id and space id', () => {
    expect(getSecurityAlertAnalysisWorkflowIdForSpace('security')).toBe(
      'system-security-alert-analysis-security'
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

  describe('readSecurityAlertAnalysisWorkflowSettings', () => {
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

      const result = await readSecurityAlertAnalysisWorkflowSettings(uiSettingsClient);

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

  describe('readSecurityAlertAnalysisWorkflowSettingsForSpace', () => {
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

      const result = await readSecurityAlertAnalysisWorkflowSettingsForSpace({
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

  describe('ensureSecurityAlertAnalysisWorkflowInstalled', () => {
    it('installs the workflow when it is missing', async () => {
      const managed = createManagedClient();
      managed.getWorkflowStatus.mockResolvedValue({ status: 'missing' });

      await ensureSecurityAlertAnalysisWorkflowInstalled({
        managedWorkflowsClient: managed,
        spaceId: 'security',
        settings,
      });

      expect(managed.install).toHaveBeenCalledWith(SECURITY_ALERT_ANALYSIS_WORKFLOW_ID, {
        spaceId: 'security',
        workflowIdSuffix: 'security',
        values: settings,
      });
    });

    it('does not reinstall the workflow when it is already installed', async () => {
      const managed = createManagedClient();
      managed.getWorkflowStatus.mockResolvedValue({ status: 'disabled' });

      await ensureSecurityAlertAnalysisWorkflowInstalled({
        managedWorkflowsClient: managed,
        spaceId: 'security',
        settings,
      });

      expect(managed.install).not.toHaveBeenCalled();
    });
  });

  describe('installSecurityAlertAnalysisWorkflowForAllSpaces', () => {
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

      await installSecurityAlertAnalysisWorkflowForAllSpaces({
        coreStart,
        workflowsExtensions,
        logger: loggerMock.create(),
      });

      expect(managed.install).toHaveBeenCalledWith(SECURITY_ALERT_ANALYSIS_WORKFLOW_ID, {
        spaceId: 'default',
        workflowIdSuffix: 'default',
        values: settings,
      });
    });

    it('bounds concurrent installs when there are many spaces', async () => {
      const spaceCount = 24;
      const coreStart = coreMock.createStart();
      const spaceRepo = coreStart.savedObjects.createInternalRepository(['space']);
      (spaceRepo.find as jest.Mock).mockResolvedValue({
        saved_objects: Array.from({ length: spaceCount }, (_, index) => ({ id: `space-${index}` })),
      });
      const uiSettingsClient = { get: jest.fn().mockResolvedValue(true) };
      (coreStart.uiSettings.asScopedToClient as jest.Mock).mockReturnValue(uiSettingsClient);

      const workflowsExtensions = workflowsExtensionsMock.createStart();
      const managed = createManagedClient();
      let active = 0;
      let maxActive = 0;
      managed.getWorkflowStatus.mockImplementation(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active -= 1;
        return { status: 'missing' };
      });
      workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(managed);

      await installSecurityAlertAnalysisWorkflowForAllSpaces({
        coreStart,
        workflowsExtensions,
        logger: loggerMock.create(),
      });

      // spaceCount named spaces plus the implicit 'default' space.
      expect(managed.getWorkflowStatus).toHaveBeenCalledTimes(spaceCount + 1);
      expect(maxActive).toBeLessThanOrEqual(10);
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
        installSecurityAlertAnalysisWorkflowForAllSpaces({
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
