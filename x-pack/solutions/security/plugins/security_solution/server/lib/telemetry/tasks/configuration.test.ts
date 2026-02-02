/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createTelemetryConfigurationTaskConfig } from './configuration';
import {
  createMockTelemetryEventsSender,
  createMockTelemetryReceiver,
  createMockTaskMetrics,
} from '../__mocks__';
import { telemetryConfiguration } from '../configuration';
import { artifactService } from '../artifact';
import type { TelemetryConfiguration, TelemetryQueryConfiguration } from '../types';

// Mock the artifact service
jest.mock('../artifact', () => ({
  artifactService: {
    getArtifact: jest.fn(),
  },
}));

const mockedArtifactService = artifactService as jest.Mocked<typeof artifactService>;

describe('telemetry configuration task test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    telemetryConfiguration.resetAllToDefault();
    jest.clearAllMocks();
  });

  test('should handle successful artifact fetch without query config', async () => {
    const testTaskExecutionPeriod = {
      last: new Date().toISOString(),
      current: new Date().toISOString(),
    };
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const telemetryConfigurationTaskConfig = createTelemetryConfigurationTaskConfig();
    const mockTaskMetrics = createMockTaskMetrics();

    const mockConfig: TelemetryConfiguration = {
      telemetry_max_buffer_size: 200,
      max_security_list_telemetry_batch: 150,
      max_endpoint_telemetry_batch: 400,
      max_detection_rule_telemetry_batch: 1500,
      max_detection_alerts_batch: 75,
      use_async_sender: true,
    };

    mockedArtifactService.getArtifact.mockResolvedValue({
      notModified: false,
      data: mockConfig,
    });

    await telemetryConfigurationTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      mockTaskMetrics,
      testTaskExecutionPeriod
    );

    expect(telemetryConfiguration.telemetry_max_buffer_size).toBe(200);
    expect(telemetryConfiguration.max_security_list_telemetry_batch).toBe(150);
    expect(telemetryConfiguration.use_async_sender).toBe(true);
    expect(telemetryConfiguration.query_config).toMatchObject({
      pageSize: 500,
      maxResponseSize: 10 * 1024 * 1024, // 10 MB
      maxCompressedResponseSize: 8 * 1024 * 1024, // 8 MB
    });
  });

  test('should handle query configuration from artifact', async () => {
    const testTaskExecutionPeriod = {
      last: new Date().toISOString(),
      current: new Date().toISOString(),
    };
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const telemetryConfigurationTaskConfig = createTelemetryConfigurationTaskConfig();
    const mockTaskMetrics = createMockTaskMetrics();

    const timelineConfig: TelemetryQueryConfiguration = {
      pageSize: 1000,
      maxResponseSize: 5000000,
      maxCompressedResponseSize: 1000000,
      excludeColdAndFrozenTiers: async () => {
        return false;
      },
    };

    const mockConfig: TelemetryConfiguration = {
      telemetry_max_buffer_size: 200,
      max_security_list_telemetry_batch: 150,
      max_endpoint_telemetry_batch: 400,
      max_detection_rule_telemetry_batch: 1500,
      max_detection_alerts_batch: 75,
      use_async_sender: true,
      query_config: timelineConfig,
    };

    mockedArtifactService.getArtifact.mockResolvedValue({
      notModified: false,
      data: mockConfig,
    });

    await telemetryConfigurationTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      mockTaskMetrics,
      testTaskExecutionPeriod
    );

    expect(telemetryConfiguration.query_config).toEqual(timelineConfig);
    expect(telemetryConfiguration.query_config.pageSize).toBe(1000);
    expect(telemetryConfiguration.query_config.maxResponseSize).toBe(5000000);
    expect(telemetryConfiguration.query_config.maxCompressedResponseSize).toBe(1000000);

    const shouldExclude = await telemetryConfiguration.query_config.excludeColdAndFrozenTiers();
    expect(shouldExclude).toBe(false);
  });

  test('should handle configuration with tier filtering enabled', async () => {
    const testTaskExecutionPeriod = {
      last: new Date().toISOString(),
      current: new Date().toISOString(),
    };
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const telemetryConfigurationTaskConfig = createTelemetryConfigurationTaskConfig();
    const mockTaskMetrics = createMockTaskMetrics();

    const timelineConfig: TelemetryQueryConfiguration = {
      pageSize: 1000,
      maxResponseSize: 5000000,
      maxCompressedResponseSize: 1000000,
      excludeColdAndFrozenTiers: async () => {
        return true;
      },
    };

    const mockConfig: TelemetryConfiguration = {
      telemetry_max_buffer_size: 200,
      max_security_list_telemetry_batch: 150,
      max_endpoint_telemetry_batch: 400,
      max_detection_rule_telemetry_batch: 1500,
      max_detection_alerts_batch: 75,
      use_async_sender: true,
      query_config: timelineConfig,
    };

    mockedArtifactService.getArtifact.mockResolvedValue({
      notModified: false,
      data: mockConfig,
    });

    await telemetryConfigurationTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      mockTaskMetrics,
      testTaskExecutionPeriod
    );

    expect(telemetryConfiguration.query_config).toEqual(timelineConfig);
    const shouldExclude = await telemetryConfiguration.query_config.excludeColdAndFrozenTiers();
    expect(shouldExclude).toBe(true);
  });

  test('should skip configuration when artifact is not modified', async () => {
    const testTaskExecutionPeriod = {
      last: new Date().toISOString(),
      current: new Date().toISOString(),
    };
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const telemetryConfigurationTaskConfig = createTelemetryConfigurationTaskConfig();
    const mockTaskMetrics = createMockTaskMetrics();

    const originalConfig = telemetryConfiguration.query_config;

    mockedArtifactService.getArtifact.mockResolvedValue({
      notModified: true,
      data: null,
    });

    await telemetryConfigurationTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      mockTaskMetrics,
      testTaskExecutionPeriod
    );

    expect(telemetryConfiguration.query_config).toEqual(originalConfig);
  });
});
