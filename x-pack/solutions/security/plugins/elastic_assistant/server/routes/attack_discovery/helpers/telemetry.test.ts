/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  reportAttackDiscoveryGenerationFailure,
  reportAttackDiscoveryGenerationSuccess,
} from './telemetry';
import { mockAttackDiscoveries } from '../../../lib/attack_discovery/evaluation/__mocks__/mock_attack_discoveries';
import { coreMock } from '@kbn/core/server/mocks';

jest.mock('lodash/fp', () => ({
  uniq: jest.fn((arr) => Array.from(new Set(arr))),
}));

describe('telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reportAttackDiscoveryGenerationFailure', () => {
    const mockTelemetry = coreMock.createSetup().analytics;
    const mockApiConfig = {
      actionTypeId: '.gen-ai',
      connectorId: 'my-gen-ai',
      model: 'gpt-4',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should report error event without schedule information', () => {
      reportAttackDiscoveryGenerationFailure({
        apiConfig: mockApiConfig,
        errorMessage: 'Epic fail!',
        telemetry: mockTelemetry,
      });

      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_error', {
        actionTypeId: '.gen-ai',
        errorMessage: 'Epic fail!',
        model: 'gpt-4',
      });
    });

    it('should report error event with schedule information', () => {
      reportAttackDiscoveryGenerationFailure({
        apiConfig: mockApiConfig,
        errorMessage: 'Epic fail!',
        scheduleInfo: { id: 'fake-id-1', interval: '21d', actions: ['.slack', '.jest'] },
        telemetry: mockTelemetry,
      });

      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_error', {
        actionTypeId: '.gen-ai',
        errorMessage: 'Epic fail!',
        model: 'gpt-4',
        scheduleInfo: { id: 'fake-id-1', interval: '21d', actions: ['.slack', '.jest'] },
      });
    });
  });

  describe('reportAttackDiscoveryGenerationSuccess', () => {
    const mockTelemetry = coreMock.createSetup().analytics;
    const mockApiConfig = {
      actionTypeId: '.gen-ai',
      connectorId: 'my-gen-ai',
      model: 'gpt-4',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should report success event without schedule information', async () => {
      reportAttackDiscoveryGenerationSuccess({
        alertsContextCount: 2,
        apiConfig: mockApiConfig,
        attackDiscoveries: mockAttackDiscoveries,
        durationMs: 123000,
        end: 'now',
        hasFilter: false,
        size: 10,
        start: 'now-24h',
        telemetry: mockTelemetry,
      });

      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_success', {
        actionTypeId: '.gen-ai',
        alertsContextCount: 2,
        alertsCount: 18,
        configuredAlertsCount: 10,
        dateRangeDuration: 24,
        discoveriesGenerated: 2,
        durationMs: 123000,
        hasFilter: false,
        isDefaultDateRange: true,
        model: 'gpt-4',
      });
    });

    it('should report success event with schedule information', async () => {
      reportAttackDiscoveryGenerationSuccess({
        alertsContextCount: 2,
        apiConfig: mockApiConfig,
        attackDiscoveries: mockAttackDiscoveries,
        durationMs: 456000,
        end: 'now',
        hasFilter: false,
        scheduleInfo: { id: 'fake-id-2', interval: '32m', actions: ['.slack', '.jest'] },
        size: 10,
        start: 'now-24h',
        telemetry: mockTelemetry,
      });

      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_success', {
        actionTypeId: '.gen-ai',
        alertsContextCount: 2,
        alertsCount: 18,
        configuredAlertsCount: 10,
        dateRangeDuration: 24,
        discoveriesGenerated: 2,
        durationMs: 456000,
        hasFilter: false,
        isDefaultDateRange: true,
        model: 'gpt-4',
        scheduleInfo: { id: 'fake-id-2', interval: '32m', actions: ['.slack', '.jest'] },
      });
    });
  });
});
