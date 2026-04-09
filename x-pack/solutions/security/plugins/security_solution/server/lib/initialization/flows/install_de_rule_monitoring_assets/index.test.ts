/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  INITIALIZATION_FLOW_INSTALL_DE_RULE_MONITORING_ASSETS,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext } from '../../types';
import { installDeRuleMonitoringAssetsFlow } from '.';

const createMockHealthClient = () => ({
  installAssetsForMonitoringHealth: jest.fn().mockResolvedValue(undefined),
  calculateRuleHealth: jest.fn(),
  calculateSpaceHealth: jest.fn(),
  calculateClusterHealth: jest.fn(),
});

const createMockInitializationFlowContext = (
  healthClient = createMockHealthClient()
): InitializationFlowContext =>
  ({
    requestHandlerContext: {
      securitySolution: Promise.resolve({
        getDetectionEngineHealthClient: () => healthClient,
      }),
    },
  } as unknown as InitializationFlowContext);

describe('installDeRuleMonitoringAssetsFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the correct id', () => {
    expect(installDeRuleMonitoringAssetsFlow.id).toBe(INITIALIZATION_FLOW_INSTALL_DE_RULE_MONITORING_ASSETS);
  });

  it('does not have runFirst set', () => {
    expect(installDeRuleMonitoringAssetsFlow.runFirst).toBeUndefined();
  });

  describe('resolveProvisionContext', () => {
    it('resolves the health client from the security context', async () => {
      const logger = loggerMock.create();
      const healthClient = createMockHealthClient();
      const context = createMockInitializationFlowContext(healthClient);

      const provisionContext = await installDeRuleMonitoringAssetsFlow.resolveProvisionContext(context, logger);

      expect(provisionContext.healthClient).toBe(healthClient);
    });
  });

  describe('provision', () => {
    it('returns ready on successful asset installation', async () => {
      const logger = loggerMock.create();
      const healthClient = createMockHealthClient();

      const result = await installDeRuleMonitoringAssetsFlow.provision({ healthClient }, logger);

      expect(result).toEqual({ status: INITIALIZATION_FLOW_STATUS_READY });
    });

    it('calls installAssetsForMonitoringHealth on the health client', async () => {
      const logger = loggerMock.create();
      const healthClient = createMockHealthClient();

      await installDeRuleMonitoringAssetsFlow.provision({ healthClient }, logger);

      expect(healthClient.installAssetsForMonitoringHealth).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from installAssetsForMonitoringHealth', async () => {
      const logger = loggerMock.create();
      const healthClient = createMockHealthClient();
      healthClient.installAssetsForMonitoringHealth.mockRejectedValue(
        new Error('Failed to import saved objects')
      );

      await expect(installDeRuleMonitoringAssetsFlow.provision({ healthClient }, logger)).rejects.toThrow(
        'Failed to import saved objects'
      );
    });
  });
});
