/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { coreMock } from '@kbn/core/server/mocks';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import { SecuritySolutionServerlessPlugin } from './plugin';
import type { SecuritySolutionServerlessPluginSetupDeps } from './types';
import { ProductLine, ProductTier } from '../common/product';

// ── Heavy module mocks ────────────────────────────────────────────────────────

vi.mock('./config', () => {
      const mocked = {
      createConfig: vi.fn().mockReturnValue({
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
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./product_features', () => {
      const mocked = {
      registerProductFeatures: vi.fn(),
      getSecurityAiSocProductTier: vi.fn().mockReturnValue(undefined),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../common/pli/pli_features', () => {
      const mocked = {
      getEnabledProductFeatures: vi.fn().mockReturnValue([]),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./task_manager/usage_reporting_task', () => {
      const mocked = {
      SecurityUsageReportingTask: vi.fn().mockImplementation(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./task_manager/nlp_cleanup_task/nlp_cleanup_task', () => {
      const mocked = {
      NLPCleanupTask: vi.fn().mockImplementation(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./telemetry/event_based_telemetry', () => {
      const mocked = {
      telemetryEvents: [],
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./common/services/usage_reporting_service', () => {
      const mocked = {
      UsageReportingService: vi.fn().mockImplementation(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./ai4soc/services', () => {
      const mocked = {
      ai4SocMeteringService: { getUsageRecords: vi.fn() },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./cloud_security/cloud_security_metering_task_config', () => {
      const mocked = {
      cloudSecurityMetringTaskProperties: {
        taskType: 'mock-task-type',
        taskTitle: 'mock-task-title',
        version: '1.0.0',
        meteringCallback: vi.fn(),
      },
    };
      return { ...mocked, default: mocked };
    });

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
    serverless: { setupProjectSettings: vi.fn() },
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

      const setupProjectSettings = deps.serverless.setupProjectSettings as Mock;
      expect(setupProjectSettings).toHaveBeenCalledTimes(1);
      const [settingsArray] = setupProjectSettings.mock.calls[0];
      expect(settingsArray).toContain(ALERTZERO_ENABLED_SETTING_ID);
    });

    it('omits ALERTZERO_ENABLED_SETTING_ID when alertzero.isEnabled is false', () => {
      const plugin = new SecuritySolutionServerlessPlugin(createContext());
      const deps = createMinimalSetupDeps({ isEnabled: false });

      plugin.setup(coreMock.createSetup(), deps);

      const setupProjectSettings = deps.serverless.setupProjectSettings as Mock;
      expect(setupProjectSettings).toHaveBeenCalledTimes(1);
      const [settingsArray] = setupProjectSettings.mock.calls[0];
      expect(settingsArray).not.toContain(ALERTZERO_ENABLED_SETTING_ID);
    });

    it('omits ALERTZERO_ENABLED_SETTING_ID when alertzero plugin is absent', () => {
      const plugin = new SecuritySolutionServerlessPlugin(createContext());
      const deps = createMinimalSetupDeps(undefined);

      plugin.setup(coreMock.createSetup(), deps);

      const setupProjectSettings = deps.serverless.setupProjectSettings as Mock;
      expect(setupProjectSettings).toHaveBeenCalledTimes(1);
      const [settingsArray] = setupProjectSettings.mock.calls[0];
      expect(settingsArray).not.toContain(ALERTZERO_ENABLED_SETTING_ID);
    });
  });
});
