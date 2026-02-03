/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';

import { reportAttackDiscoverySuccessTelemetry } from './report_attack_discovery_success_telemetry';
import { mockAnonymizedAlerts } from '../../../lib/attack_discovery/evaluation/__mocks__/mock_anonymized_alerts';
import { mockAttackDiscoveries } from '../../../lib/attack_discovery/evaluation/__mocks__/mock_attack_discoveries';
import { reportAttackDiscoveryGenerationSuccess } from './telemetry';

jest.mock('lodash/fp', () => ({
  uniq: jest.fn((arr) => Array.from(new Set(arr))),
}));

jest.mock('@kbn/securitysolution-es-utils', () => ({
  transformError: jest.fn((err) => err),
}));
jest.mock('@kbn/langchain/server', () => ({
  ActionsClientLlm: jest.fn(),
}));
jest.mock('../../evaluate/utils', () => ({
  getLangSmithTracer: jest.fn().mockReturnValue([]),
}));
jest.mock('../../utils', () => ({
  getLlmType: jest.fn().mockReturnValue('llm-type'),
}));
jest.mock('./telemetry', () => {
  const actual = jest.requireActual('./telemetry');
  return {
    ...actual,
    reportAttackDiscoveryGenerationSuccess: jest.fn(actual.reportAttackDiscoveryGenerationSuccess),
  };
});

let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

describe('helpers', () => {
  const date = '2024-03-28T22:27:28.000Z';
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date(date));
    mockLogger = loggingSystemMock.createLogger();
  });

  describe('reportAttackDiscoverySuccessTelemetry', () => {
    const mockTelemetry = coreMock.createSetup().analytics;
    const mockStartTime = moment('2024-03-28T22:27:28.000Z');
    const mockApiConfig = {
      actionTypeId: '.gen-ai',
      connectorId: 'my-gen-ai',
      model: 'gpt-4',
    };
    const mockReplacements = {};

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should report attack discovery telemetry successfully', () => {
      reportAttackDiscoverySuccessTelemetry({
        anonymizedAlerts: mockAnonymizedAlerts,
        apiConfig: mockApiConfig,
        attackDiscoveries: mockAttackDiscoveries,
        hasFilter: false,
        end: 'now',
        latestReplacements: mockReplacements,
        logger: mockLogger,
        size: 10,
        start: 'now-24h',
        startTime: mockStartTime,
        telemetry: mockTelemetry,
      });

      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_success', {
        actionTypeId: '.gen-ai',
        alertsContextCount: 2,
        alertsCount: 18,
        configuredAlertsCount: 10,
        dateRangeDuration: 24,
        discoveriesGenerated: 2,
        durationMs: 0,
        hasFilter: false,
        isDefaultDateRange: true,
        model: 'gpt-4',
      });
    });

    it('should detect non-default time range', () => {
      reportAttackDiscoverySuccessTelemetry({
        anonymizedAlerts: mockAnonymizedAlerts,
        apiConfig: mockApiConfig,
        attackDiscoveries: mockAttackDiscoveries,
        hasFilter: false,
        end: 'now',
        latestReplacements: mockReplacements,
        logger: mockLogger,
        size: 10,
        start: 'now-1w',
        startTime: mockStartTime,
        telemetry: mockTelemetry,
      });

      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_success', {
        actionTypeId: '.gen-ai',
        alertsContextCount: 2,
        alertsCount: 18,
        configuredAlertsCount: 10,
        dateRangeDuration: 168,
        discoveriesGenerated: 2,
        durationMs: 0,
        hasFilter: false,
        isDefaultDateRange: false,
        model: 'gpt-4',
      });
    });

    it('hasFilter should be true when filter exists', () => {
      reportAttackDiscoverySuccessTelemetry({
        anonymizedAlerts: mockAnonymizedAlerts,
        apiConfig: mockApiConfig,
        attackDiscoveries: mockAttackDiscoveries,
        hasFilter: true,
        end: 'now',
        latestReplacements: mockReplacements,
        logger: mockLogger,
        size: 10,
        start: 'now-24h',
        startTime: mockStartTime,
        telemetry: mockTelemetry,
      });

      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_success', {
        actionTypeId: '.gen-ai',
        alertsContextCount: 2,
        alertsCount: 18,
        configuredAlertsCount: 10,
        dateRangeDuration: 24,
        discoveriesGenerated: 2,
        durationMs: 0,
        hasFilter: true,
        isDefaultDateRange: true,
        model: 'gpt-4',
      });
    });

    it('calls logger.error when reporting telemetry throws', () => {
      (reportAttackDiscoveryGenerationSuccess as jest.Mock).mockImplementation(() => {
        throw new Error('simulated error');
      });

      reportAttackDiscoverySuccessTelemetry({
        anonymizedAlerts: mockAnonymizedAlerts,
        apiConfig: mockApiConfig,
        attackDiscoveries: mockAttackDiscoveries,
        hasFilter: false,
        end: 'now',
        latestReplacements: mockReplacements,
        logger: mockLogger,
        size: 10,
        start: 'now-24h',
        startTime: mockStartTime,
        telemetry: mockTelemetry,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to report attack discovery success telemetry: Error: simulated error'
        )
      );
    });
  });
});
