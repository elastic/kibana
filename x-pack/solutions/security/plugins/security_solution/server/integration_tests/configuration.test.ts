/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import axios from 'axios';

import { cloneDeep } from 'lodash';

import { telemetryConfiguration } from '../lib/telemetry/configuration';
import {
  TaskManagerPlugin,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server/plugin';

import {
  setupTestServers,
  removeFile,
  mockAxiosPost,
  DEFAULT_GET_ROUTES,
  mockAxiosGet,
  getRandomInt,
} from './lib/helpers';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { Plugin as SecuritySolutionPlugin } from '../plugin';
import { getTelemetryTasks, runSoonConfigTask } from './lib/telemetry_helpers';
import type { SecurityTelemetryTask } from '../lib/telemetry/task';

jest.mock('axios');

const logFilePath = Path.join(__dirname, 'config.logs.log');
const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');
const securitySolutionStartSpy = jest.spyOn(SecuritySolutionPlugin.prototype, 'start');

const mockedAxiosGet = jest.spyOn(axios, 'get');
const mockedAxiosPost = jest.spyOn(axios, 'post');

const securitySolutionPlugin = jest.spyOn(SecuritySolutionPlugin.prototype, 'start');

describe('configuration', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManagerPlugin: TaskManagerStartContract;
  let tasks: SecurityTelemetryTask[];

  beforeAll(async () => {
    await removeFile(logFilePath);

    const servers = await setupTestServers(logFilePath);

    esServer = servers.esServer;
    kibanaServer = servers.kibanaServer;

    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    taskManagerPlugin = taskManagerStartSpy.mock.results[0].value;

    expect(securitySolutionStartSpy).toHaveBeenCalledTimes(1);

    tasks = getTelemetryTasks(securitySolutionStartSpy);

    expect(securitySolutionPlugin).toHaveBeenCalledTimes(1);
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAxiosPost(mockedAxiosPost);
  });

  afterEach(async () => {});

  describe('configuration task', () => {
    it('should keep default values when no new config was provided', async () => {
      const before = cloneDeep(telemetryConfiguration);

      await runSoonConfigTask(tasks, taskManagerPlugin);

      expect(telemetryConfiguration).toEqual(before);
    });

    it('should update values with new manifest', async () => {
      const expected = {
        telemetry_max_buffer_size: getRandomInt(1, 100),
        max_security_list_telemetry_batch: getRandomInt(1, 100),
        max_endpoint_telemetry_batch: getRandomInt(1, 100),
        max_detection_rule_telemetry_batch: getRandomInt(1, 100),
        max_detection_alerts_batch: getRandomInt(1, 100),
        use_async_sender: true,
        pagination_config: {
          max_page_size_bytes: getRandomInt(1, 100),
          num_docs_to_sample: getRandomInt(1, 100),
        },
        sender_channels: {
          default: {
            buffer_time_span_millis: getRandomInt(1, 100),
            inflight_events_threshold: getRandomInt(1, 100),
            max_payload_size_bytes: getRandomInt(1, 100),
          },
        },
        indices_metadata_config: {
          indices_threshold: getRandomInt(1, 100),
          datastreams_threshold: getRandomInt(1, 100),
          indices_settings_threshold: getRandomInt(1, 100),
          max_prefixes: getRandomInt(1, 100),
          max_group_size: getRandomInt(1, 100),
        },
        ingest_pipelines_stats_config: {
          enabled: false,
        },
        health_diagnostic_config: {
          query: {
            maxDocuments: getRandomInt(1000, 50000),
            bufferSize: getRandomInt(100, 5000),
          },
          rssGrowthCircuitBreaker: {
            maxRssGrowthPercent: getRandomInt(10, 80),
            validationIntervalMs: getRandomInt(50, 500),
          },
          timeoutCircuitBreaker: {
            timeoutMillis: getRandomInt(500, 5000),
            validationIntervalMs: getRandomInt(10, 100),
          },
          eventLoopUtilizationCircuitBreaker: {
            thresholdMillis: getRandomInt(500, 2000),
            validationIntervalMs: getRandomInt(10, 100),
          },
          eventLoopDelayCircuitBreaker: {
            thresholdMillis: getRandomInt(50, 200),
            validationIntervalMs: getRandomInt(5, 50),
          },
          elasticsearchCircuitBreaker: {
            maxJvmHeapUsedPercent: getRandomInt(50, 90),
            maxCpuPercent: getRandomInt(50, 90),
            expectedClusterHealth: ['green'],
            validationIntervalMs: getRandomInt(500, 2000),
          },
        },
      };

      mockAxiosGet(mockedAxiosGet, [
        ...DEFAULT_GET_ROUTES,
        [/.*telemetry-buffer-and-batch-sizes-v1.*/, { status: 200, data: cloneDeep(expected) }],
      ]);

      await runSoonConfigTask(tasks, taskManagerPlugin);

      expect(telemetryConfiguration.telemetry_max_buffer_size).toEqual(
        expected.telemetry_max_buffer_size
      );
      expect(telemetryConfiguration.max_security_list_telemetry_batch).toEqual(
        expected.max_security_list_telemetry_batch
      );
      expect(telemetryConfiguration.max_endpoint_telemetry_batch).toEqual(
        expected.max_endpoint_telemetry_batch
      );
      expect(telemetryConfiguration.max_detection_rule_telemetry_batch).toEqual(
        expected.max_detection_rule_telemetry_batch
      );
      expect(telemetryConfiguration.max_detection_alerts_batch).toEqual(
        expected.max_detection_alerts_batch
      );
      expect(telemetryConfiguration.use_async_sender).toEqual(expected.use_async_sender);
      expect(telemetryConfiguration.sender_channels).toEqual(expected.sender_channels);
      expect(telemetryConfiguration.pagination_config).toEqual(expected.pagination_config);
      expect(telemetryConfiguration.indices_metadata_config).toEqual(
        expected.indices_metadata_config
      );
      expect(telemetryConfiguration.ingest_pipelines_stats_config).toEqual(
        expected.ingest_pipelines_stats_config
      );
      expect(telemetryConfiguration.health_diagnostic_config).toEqual(
        expected.health_diagnostic_config
      );
    });

    it('should update health diagnostic config independently', async () => {
      const originalConfig = cloneDeep(telemetryConfiguration.health_diagnostic_config);

      const expectedHealthConfig = {
        health_diagnostic_config: {
          query: {
            maxDocuments: getRandomInt(10000, 200000),
            bufferSize: getRandomInt(1000, 20000),
          },
          rssGrowthCircuitBreaker: {
            maxRssGrowthPercent: getRandomInt(20, 60),
            validationIntervalMs: getRandomInt(100, 1000),
          },
          timeoutCircuitBreaker: {
            timeoutMillis: getRandomInt(2000, 10000),
            validationIntervalMs: getRandomInt(20, 200),
          },
          eventLoopUtilizationCircuitBreaker: {
            thresholdMillis: getRandomInt(1000, 3000),
            validationIntervalMs: getRandomInt(20, 200),
          },
          eventLoopDelayCircuitBreaker: {
            thresholdMillis: getRandomInt(20, 300),
            validationIntervalMs: getRandomInt(1, 20),
          },
          elasticsearchCircuitBreaker: {
            maxJvmHeapUsedPercent: getRandomInt(60, 95),
            maxCpuPercent: getRandomInt(60, 95),
            expectedClusterHealth: ['green', 'yellow'],
            validationIntervalMs: getRandomInt(1000, 5000),
          },
        },
      };

      mockAxiosGet(mockedAxiosGet, [
        ...DEFAULT_GET_ROUTES,
        [
          /.*telemetry-buffer-and-batch-sizes-v1.*/,
          { status: 200, data: cloneDeep(expectedHealthConfig) },
        ],
      ]);

      await runSoonConfigTask(tasks, taskManagerPlugin);

      // Verify health diagnostic config was updated
      expect(telemetryConfiguration.health_diagnostic_config).toEqual(
        expectedHealthConfig.health_diagnostic_config
      );

      // Verify health diagnostic config is different from original
      expect(telemetryConfiguration.health_diagnostic_config).not.toEqual(originalConfig);
    });

    it('should handle partial health diagnostic config updates', async () => {
      const partialHealthConfig = {
        health_diagnostic_config: {
          query: {
            maxDocuments: getRandomInt(50000, 150000),
            bufferSize: getRandomInt(5000, 15000),
          },
        },
      };

      mockAxiosGet(mockedAxiosGet, [
        ...DEFAULT_GET_ROUTES,
        [
          /.*telemetry-buffer-and-batch-sizes-v1.*/,
          { status: 200, data: cloneDeep(partialHealthConfig) },
        ],
      ]);

      await runSoonConfigTask(tasks, taskManagerPlugin);

      // Verify query config was updated
      expect(telemetryConfiguration.health_diagnostic_config.query).toEqual(
        partialHealthConfig.health_diagnostic_config.query
      );

      // Verify other circuit breaker configs remain unchanged (should use defaults or previous values)
      expect(telemetryConfiguration.health_diagnostic_config.rssGrowthCircuitBreaker).toBeDefined();
      expect(telemetryConfiguration.health_diagnostic_config.timeoutCircuitBreaker).toBeDefined();
      expect(
        telemetryConfiguration.health_diagnostic_config.eventLoopUtilizationCircuitBreaker
      ).toBeDefined();
      expect(
        telemetryConfiguration.health_diagnostic_config.eventLoopDelayCircuitBreaker
      ).toBeDefined();
      expect(
        telemetryConfiguration.health_diagnostic_config.elasticsearchCircuitBreaker
      ).toBeDefined();
    });

    it('should reset health diagnostic config to defaults when resetAllToDefault is called', async () => {
      // First, update with custom values
      const customConfig = {
        health_diagnostic_config: {
          query: { maxDocuments: 999999, bufferSize: 999999 },
          rssGrowthCircuitBreaker: { maxRssGrowthPercent: 99, validationIntervalMs: 999 },
          timeoutCircuitBreaker: { timeoutMillis: 999999, validationIntervalMs: 999 },
          eventLoopUtilizationCircuitBreaker: {
            thresholdMillis: 999999,
            validationIntervalMs: 999,
          },
          eventLoopDelayCircuitBreaker: { thresholdMillis: 999, validationIntervalMs: 999 },
          elasticsearchCircuitBreaker: {
            maxJvmHeapUsedPercent: 99,
            maxCpuPercent: 99,
            expectedClusterHealth: ['red'],
            validationIntervalMs: 999999,
          },
        },
      };

      mockAxiosGet(mockedAxiosGet, [
        ...DEFAULT_GET_ROUTES,
        [/.*telemetry-buffer-and-batch-sizes-v1.*/, { status: 200, data: cloneDeep(customConfig) }],
      ]);

      await runSoonConfigTask(tasks, taskManagerPlugin);

      // Verify custom values were set
      expect(telemetryConfiguration.health_diagnostic_config.query.maxDocuments).toBe(999999);
      expect(
        telemetryConfiguration.health_diagnostic_config.rssGrowthCircuitBreaker.maxRssGrowthPercent
      ).toBe(99);

      // Reset to defaults
      telemetryConfiguration.resetAllToDefault();

      // Verify default values are restored
      expect(telemetryConfiguration.health_diagnostic_config.query.maxDocuments).toBe(10_000);
      expect(telemetryConfiguration.health_diagnostic_config.query.bufferSize).toBe(1_000);
      expect(
        telemetryConfiguration.health_diagnostic_config.rssGrowthCircuitBreaker.maxRssGrowthPercent
      ).toBe(40);
      expect(
        telemetryConfiguration.health_diagnostic_config.rssGrowthCircuitBreaker.validationIntervalMs
      ).toBe(500);
      expect(
        telemetryConfiguration.health_diagnostic_config.timeoutCircuitBreaker.timeoutMillis
      ).toBe(5000);
      expect(
        telemetryConfiguration.health_diagnostic_config.timeoutCircuitBreaker.validationIntervalMs
      ).toBe(500);
      expect(
        telemetryConfiguration.health_diagnostic_config.eventLoopUtilizationCircuitBreaker
          .thresholdMillis
      ).toBe(5000);
      expect(
        telemetryConfiguration.health_diagnostic_config.eventLoopUtilizationCircuitBreaker
          .validationIntervalMs
      ).toBe(500);
      expect(
        telemetryConfiguration.health_diagnostic_config.eventLoopDelayCircuitBreaker.thresholdMillis
      ).toBe(500);
      expect(
        telemetryConfiguration.health_diagnostic_config.eventLoopDelayCircuitBreaker
          .validationIntervalMs
      ).toBe(250);
      expect(
        telemetryConfiguration.health_diagnostic_config.elasticsearchCircuitBreaker
          .maxJvmHeapUsedPercent
      ).toBe(90);
      expect(
        telemetryConfiguration.health_diagnostic_config.elasticsearchCircuitBreaker.maxCpuPercent
      ).toBe(90);
      expect(
        telemetryConfiguration.health_diagnostic_config.elasticsearchCircuitBreaker
          .expectedClusterHealth
      ).toEqual(['green', 'yellow']);
      expect(
        telemetryConfiguration.health_diagnostic_config.elasticsearchCircuitBreaker
          .validationIntervalMs
      ).toBe(1000);
    });

    it('should handle invalid health diagnostic config gracefully', async () => {
      mockAxiosGet(mockedAxiosGet, [
        ...DEFAULT_GET_ROUTES,
        [/.*telemetry-buffer-and-batch-sizes-v1.*/, { status: 500, data: null }],
      ]);

      await runSoonConfigTask(tasks, taskManagerPlugin);

      // Configuration should remain unchanged or reset to defaults
      expect(telemetryConfiguration.health_diagnostic_config).toBeDefined();
      expect(telemetryConfiguration.health_diagnostic_config.query).toBeDefined();
      expect(telemetryConfiguration.health_diagnostic_config.rssGrowthCircuitBreaker).toBeDefined();
      expect(telemetryConfiguration.health_diagnostic_config.timeoutCircuitBreaker).toBeDefined();
      expect(
        telemetryConfiguration.health_diagnostic_config.eventLoopUtilizationCircuitBreaker
      ).toBeDefined();
      expect(
        telemetryConfiguration.health_diagnostic_config.eventLoopDelayCircuitBreaker
      ).toBeDefined();
      expect(
        telemetryConfiguration.health_diagnostic_config.elasticsearchCircuitBreaker
      ).toBeDefined();
    });

    it('should validate health diagnostic config structure', async () => {
      const validConfig = telemetryConfiguration.health_diagnostic_config;

      expect(validConfig).toHaveProperty('query');
      expect(validConfig).toHaveProperty('rssGrowthCircuitBreaker');
      expect(validConfig).toHaveProperty('timeoutCircuitBreaker');
      expect(validConfig).toHaveProperty('eventLoopUtilizationCircuitBreaker');
      expect(validConfig).toHaveProperty('eventLoopDelayCircuitBreaker');
      expect(validConfig).toHaveProperty('elasticsearchCircuitBreaker');

      expect(validConfig.query).toHaveProperty('maxDocuments');
      expect(validConfig.query).toHaveProperty('bufferSize');
      expect(typeof validConfig.query.maxDocuments).toBe('number');
      expect(typeof validConfig.query.bufferSize).toBe('number');

      expect(validConfig.rssGrowthCircuitBreaker).toHaveProperty('maxRssGrowthPercent');
      expect(validConfig.rssGrowthCircuitBreaker).toHaveProperty('validationIntervalMs');
      expect(typeof validConfig.rssGrowthCircuitBreaker.maxRssGrowthPercent).toBe('number');
      expect(typeof validConfig.rssGrowthCircuitBreaker.validationIntervalMs).toBe('number');

      expect(validConfig.timeoutCircuitBreaker).toHaveProperty('timeoutMillis');
      expect(validConfig.timeoutCircuitBreaker).toHaveProperty('validationIntervalMs');
      expect(typeof validConfig.timeoutCircuitBreaker.timeoutMillis).toBe('number');
      expect(typeof validConfig.timeoutCircuitBreaker.validationIntervalMs).toBe('number');

      expect(validConfig.eventLoopUtilizationCircuitBreaker).toHaveProperty('thresholdMillis');
      expect(validConfig.eventLoopUtilizationCircuitBreaker).toHaveProperty('validationIntervalMs');
      expect(typeof validConfig.eventLoopUtilizationCircuitBreaker.thresholdMillis).toBe('number');
      expect(typeof validConfig.eventLoopUtilizationCircuitBreaker.validationIntervalMs).toBe(
        'number'
      );

      expect(validConfig.eventLoopDelayCircuitBreaker).toHaveProperty('thresholdMillis');
      expect(validConfig.eventLoopDelayCircuitBreaker).toHaveProperty('validationIntervalMs');
      expect(typeof validConfig.eventLoopDelayCircuitBreaker.thresholdMillis).toBe('number');
      expect(typeof validConfig.eventLoopDelayCircuitBreaker.validationIntervalMs).toBe('number');

      expect(validConfig.elasticsearchCircuitBreaker).toHaveProperty('maxJvmHeapUsedPercent');
      expect(validConfig.elasticsearchCircuitBreaker).toHaveProperty('maxCpuPercent');
      expect(validConfig.elasticsearchCircuitBreaker).toHaveProperty('expectedClusterHealth');
      expect(validConfig.elasticsearchCircuitBreaker).toHaveProperty('validationIntervalMs');
      expect(typeof validConfig.elasticsearchCircuitBreaker.maxJvmHeapUsedPercent).toBe('number');
      expect(typeof validConfig.elasticsearchCircuitBreaker.maxCpuPercent).toBe('number');
      expect(Array.isArray(validConfig.elasticsearchCircuitBreaker.expectedClusterHealth)).toBe(
        true
      );
      expect(typeof validConfig.elasticsearchCircuitBreaker.validationIntervalMs).toBe('number');
    });
  });
});
