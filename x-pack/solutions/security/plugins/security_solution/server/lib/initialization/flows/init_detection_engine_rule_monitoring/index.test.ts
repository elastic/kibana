/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  INITIALIZATION_FLOW_INIT_DETECTION_ENGINE_RULE_MONITORING,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext } from '../../types';
import { initDetectionEngineRuleMonitoringFlow } from '.';

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
    logger: loggerMock.create(),
  } as unknown as InitializationFlowContext);

describe('initDetectionEngineRuleMonitoringFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the correct id', () => {
    expect(initDetectionEngineRuleMonitoringFlow.id).toBe(
      INITIALIZATION_FLOW_INIT_DETECTION_ENGINE_RULE_MONITORING
    );
  });

  it('should be configured to run in parallel', () => {
    expect(initDetectionEngineRuleMonitoringFlow.runFirst).toBeUndefined();
  });

  describe('runFlow', () => {
    it('returns ready on successful asset installation', async () => {
      const context = createMockInitializationFlowContext();
      const result = await initDetectionEngineRuleMonitoringFlow.runFlow(context);

      expect(result).toEqual({ status: INITIALIZATION_FLOW_STATUS_READY, payload: null });
    });

    it('calls installAssetsForMonitoringHealth on the health client', async () => {
      const healthClient = createMockHealthClient();
      const context = createMockInitializationFlowContext(healthClient);

      await initDetectionEngineRuleMonitoringFlow.runFlow(context);

      expect(healthClient.installAssetsForMonitoringHealth).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from installAssetsForMonitoringHealth', async () => {
      const healthClient = createMockHealthClient();
      healthClient.installAssetsForMonitoringHealth.mockRejectedValue(
        new Error('Failed to import saved objects')
      );

      const context = createMockInitializationFlowContext(healthClient);
      await expect(initDetectionEngineRuleMonitoringFlow.runFlow(context)).rejects.toThrow(
        'Failed to import saved objects'
      );
    });
  });
});
