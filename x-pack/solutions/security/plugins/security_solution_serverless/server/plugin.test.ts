/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import { SecuritySolutionServerlessPlugin } from './plugin';
import type { SecuritySolutionServerlessPluginSetupDeps } from './types';
import { ProductLine, ProductTier } from '../common/product';

// ── Heavy module mocks ────────────────────────────────────────────────────────

jest.mock('./config', () => ({
  createConfig: jest.fn().mockReturnValue({
    productTypes: [],
    experimentalFeatures: {
      enableAlertsAndAttacksAlignment: false,
      ruleChangesHistoryEnabled: false,
    },
    usageApi: { enabled: false, url: undefined },
    usageReportingTaskInterval: '1h',
    cloudSecurityUsageReportingTaskInterval: '30m',
    ai4SocUsageReportingTaskInterval: '1h',
    usageReportingTaskTimeout: '1m',
    cloudSecurityMetering: { cspm: { enabled: false } },
  }),
}));

jest.mock('./product_features', () => ({
  registerProductFeatures: jest.fn(),
  getSecurityAiSocProductTier: jest.fn().mockReturnValue(undefined),
}));

jest.mock('../common/pli/pli_features', () => ({
  getEnabledProductFeatures: jest.fn().mockReturnValue([]),
}));

jest.mock('./task_manager/usage_reporting_task', () => ({
  SecurityUsageReportingTask: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('./task_manager/nlp_cleanup_task/nlp_cleanup_task', () => ({
  NLPCleanupTask: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('./telemetry/event_based_telemetry', () => ({
  telemetryEvents: [],
}));

jest.mock('./common/services/usage_reporting_service', () => ({
  UsageReportingService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('./ai4soc/services', () => ({
  ai4SocMeteringService: { getUsageRecords: jest.fn() },
}));

jest.mock('./cloud_security/cloud_security_metering_task_config', () => ({
  cloudSecurityMetringTaskProperties: {
    taskType: 'mock-task-type',
    taskTitle: 'mock-task-title',
    version: '1.0.0',
    meteringCallback: jest.fn(),
  },
}));

// ─────────────────────────────────────────────────────────────────────────────

const createMinimalSetupDeps = (alertzero?: {
  isEnabled: boolean;
}): SecuritySolutionServerlessPluginSetupDeps =>
  ({
    security: {} as SecuritySolutionServerlessPluginSetupDeps['security'],
    securitySolution: {
      experimentalFeatures: {},
    } as unknown as SecuritySolutionServerlessPluginSetupDeps['securitySolution'],
    securitySolutionEss: {} as SecuritySolutionServerlessPluginSetupDeps['securitySolutionEss'],
    serverless: { setupProjectSettings: jest.fn() },
    features: {} as SecuritySolutionServerlessPluginSetupDeps['features'],
    taskManager: {} as SecuritySolutionServerlessPluginSetupDeps['taskManager'],
    cloud: {} as SecuritySolutionServerlessPluginSetupDeps['cloud'],
    actions: {} as SecuritySolutionServerlessPluginSetupDeps['actions'],
    alertzero,
  } as unknown as SecuritySolutionServerlessPluginSetupDeps);

describe('SecuritySolutionServerlessPlugin', () => {
  describe('setup — alertzero project-setting allowlist', () => {
    const createContext = () =>
      coreMock.createPluginInitializerContext({
        productTypes: [{ product_line: ProductLine.security, product_tier: ProductTier.complete }],
        enableExperimental: [],
        usageApi: { enabled: false },
        usageReportingTaskInterval: '1h',
        cloudSecurityUsageReportingTaskInterval: '30m',
        ai4SocUsageReportingTaskInterval: '1h',
        usageReportingTaskTimeout: '1m',
        cloudSecurityMetering: { cspm: { enabled: false } },
      });

    it('includes ALERTZERO_ENABLED_SETTING_ID when alertzero.isEnabled is true', () => {
      const plugin = new SecuritySolutionServerlessPlugin(createContext());
      const deps = createMinimalSetupDeps({ isEnabled: true });

      plugin.setup(coreMock.createSetup(), deps);

      const setupProjectSettings = deps.serverless.setupProjectSettings as jest.Mock;
      expect(setupProjectSettings).toHaveBeenCalledTimes(1);
      const [settingsArray] = setupProjectSettings.mock.calls[0];
      expect(settingsArray).toContain(ALERTZERO_ENABLED_SETTING_ID);
    });

    it('omits ALERTZERO_ENABLED_SETTING_ID when alertzero.isEnabled is false', () => {
      const plugin = new SecuritySolutionServerlessPlugin(createContext());
      const deps = createMinimalSetupDeps({ isEnabled: false });

      plugin.setup(coreMock.createSetup(), deps);

      const setupProjectSettings = deps.serverless.setupProjectSettings as jest.Mock;
      expect(setupProjectSettings).toHaveBeenCalledTimes(1);
      const [settingsArray] = setupProjectSettings.mock.calls[0];
      expect(settingsArray).not.toContain(ALERTZERO_ENABLED_SETTING_ID);
    });

    it('omits ALERTZERO_ENABLED_SETTING_ID when alertzero plugin is absent', () => {
      const plugin = new SecuritySolutionServerlessPlugin(createContext());
      const deps = createMinimalSetupDeps(undefined);

      plugin.setup(coreMock.createSetup(), deps);

      const setupProjectSettings = deps.serverless.setupProjectSettings as jest.Mock;
      expect(setupProjectSettings).toHaveBeenCalledTimes(1);
      const [settingsArray] = setupProjectSettings.mock.calls[0];
      expect(settingsArray).not.toContain(ALERTZERO_ENABLED_SETTING_ID);
    });
  });
});
