/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { ElasticsearchCircuitBreaker } from './elastic_search_circuit_breaker';
import {
  EventLoopDelayCircuitBreaker,
  ONE_MILLISECOND_AS_NANOSECONDS,
} from './event_loop_delay_circuit_breaker';
import { EventLoopUtilizationCircuitBreaker } from './event_loop_utilization_circuit_breaker';
import { RssGrowthCircuitBreaker } from './rss_growth_circuit_breaker';
import { TimeoutCircuitBreaker } from './timeout_circuit_breaker';
import {
  createMockEsClient,
  createMockEventLoopMonitor,
  createMockPerformance,
  createMockMemoryUsage,
  createMockNodeResponse,
  createElasticsearchCircuitBreakerConfig,
  createEventLoopDelayCircuitBreakerConfig,
  createEventLoopUtilizationCircuitBreakerConfig,
  createRssGrowthCircuitBreakerConfig,
  createTimeoutCircuitBreakerConfig,
  expectValidCircuitBreakerResult,
  expectInvalidCircuitBreakerResult,
} from '../__mocks__';
import type { ElasticsearchClient } from '@kbn/core/server';
import * as perf_hooks from 'perf_hooks';

jest.mock('perf_hooks', () => ({
  performance: {
    now: jest.fn(),
    eventLoopUtilization: jest.fn(),
  },
  monitorEventLoopDelay: jest.fn(),
}));

const mockPerformance = performance as jest.Mocked<typeof performance>;
const mockMonitorEventLoopDelay = perf_hooks.monitorEventLoopDelay as jest.MockedFunction<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('Security Solution - Health Diagnostic Queries - Circuit Breakers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process, 'memoryUsage').mockReturnValue(createMockMemoryUsage());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ElasticsearchCircuitBreaker', () => {
    let mockEsClient: ReturnType<typeof createMockEsClient>;
    let circuitBreaker: ElasticsearchCircuitBreaker;

    beforeEach(() => {
      mockEsClient = createMockEsClient();
    });

    const createCircuitBreaker = (configOverrides = {}) => {
      const config = createElasticsearchCircuitBreakerConfig(configOverrides);
      return new ElasticsearchCircuitBreaker(config, mockEsClient as any as ElasticsearchClient); // eslint-disable-line @typescript-eslint/no-explicit-any
    };

    describe('constructor validation', () => {
      test('should accept valid maxJvmHeapUsedPercent values', () => {
        expect(() => createCircuitBreaker({ maxJvmHeapUsedPercent: 50 })).not.toThrow();
      });

      test('should throw error for negative maxJvmHeapUsedPercent', () => {
        expect(() => createCircuitBreaker({ maxJvmHeapUsedPercent: -1 })).toThrow(
          'maxJvmHeapUsedPercent must be between 0 and 100'
        );
      });

      test('should throw error for maxJvmHeapUsedPercent over 100', () => {
        expect(() => createCircuitBreaker({ maxJvmHeapUsedPercent: 101 })).toThrow(
          'maxJvmHeapUsedPercent must be between 0 and 100'
        );
      });
    });

    describe('validate()', () => {
      beforeEach(() => {
        circuitBreaker = createCircuitBreaker();
      });

      const setupHealthyClusterResponse = (nodeOverrides = {}) => {
        mockEsClient.cluster.health.mockResolvedValue({ status: 'green' });
        mockEsClient.nodes.stats.mockResolvedValue({
          nodes: {
            node1: createMockNodeResponse(nodeOverrides),
          },
        });
      };

      test('should succeed with healthy cluster and nodes', async () => {
        setupHealthyClusterResponse();
        const result = await circuitBreaker.validate();
        expectValidCircuitBreakerResult(result, 'ElasticsearchCircuitBreaker');
      });

      test('should fail with unhealthy cluster status', async () => {
        mockEsClient.cluster.health.mockResolvedValue({ status: 'red' });
        const result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'ElasticsearchCircuitBreaker',
          'Elasticsearch cluster health is red'
        );
      });

      test('should fail when no nodes found', async () => {
        mockEsClient.cluster.health.mockResolvedValue({ status: 'green' });
        mockEsClient.nodes.stats.mockResolvedValue({ nodes: {} });
        const result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'ElasticsearchCircuitBreaker',
          'No Elasticsearch nodes found'
        );
      });

      test('should fail when node is stale (no timestamp)', async () => {
        setupHealthyClusterResponse({ timestamp: undefined });
        const result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'ElasticsearchCircuitBreaker',
          'Node node1 is stale'
        );
      });

      test('should fail when node timestamp has not changed', async () => {
        const timestamp = 1234567890;
        setupHealthyClusterResponse({ timestamp });

        // First call should succeed
        let result = await circuitBreaker.validate();
        expect(result.valid).toBe(true);

        // Second call with same timestamp should fail
        result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'ElasticsearchCircuitBreaker',
          'Node node1 is stale'
        );
      });

      test('should fail when JVM heap usage exceeds threshold', async () => {
        setupHealthyClusterResponse({ heapUsedPercent: 90 }); // Above 85% threshold
        const result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'ElasticsearchCircuitBreaker',
          'Node node1 JVM heap used 90% exceeds threshold'
        );
      });

      test('should fail when CPU usage exceeds threshold', async () => {
        setupHealthyClusterResponse({ cpuPercent: 95 }); // Above 90% threshold
        const result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'ElasticsearchCircuitBreaker',
          'Node node1 CPU usage 95% exceeds threshold'
        );
      });

      test('should handle Elasticsearch client errors', async () => {
        mockEsClient.cluster.health.mockRejectedValue(new Error('Connection failed'));
        const result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'ElasticsearchCircuitBreaker',
          'Failed to get ES cluster or node stats: Connection failed'
        );
      });

      test('should handle missing JVM or OS stats gracefully', async () => {
        mockEsClient.cluster.health.mockResolvedValue({ status: 'green' });
        mockEsClient.nodes.stats.mockResolvedValue({
          nodes: {
            node1: {
              timestamp: 1234567890,
              // Missing jvm and os stats
            },
          },
        });
        const result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'ElasticsearchCircuitBreaker',
          'Node node1 missing metrics. JVM: undefined, OS: undefined'
        );
      });
    });

    describe('stats()', () => {
      test('should return initial stats', () => {
        circuitBreaker = createCircuitBreaker();
        const stats = circuitBreaker.stats();
        expect(stats).toEqual({
          clusterHealth: 'green',
          jvmHeapUsedPercentPerNode: undefined,
          cpuPercentPerNode: undefined,
        });
      });
    });

    describe('validationIntervalMs()', () => {
      test('should return configured validation interval', () => {
        circuitBreaker = createCircuitBreaker({ validationIntervalMs: 10000 });
        expect(circuitBreaker.validationIntervalMs()).toBe(10000);
      });
    });
  });

  describe('EventLoopDelayCircuitBreaker', () => {
    let mockMonitor: ReturnType<typeof createMockEventLoopMonitor>;

    beforeEach(() => {
      mockMonitor = createMockEventLoopMonitor();
      mockMonitorEventLoopDelay.mockReturnValue(mockMonitor);
    });

    const createCircuitBreaker = (configOverrides = {}) => {
      const config = createEventLoopDelayCircuitBreakerConfig(configOverrides);
      return new EventLoopDelayCircuitBreaker(config);
    };

    describe('constructor', () => {
      test('should create monitor and enable it', () => {
        createCircuitBreaker();
        expect(mockMonitorEventLoopDelay).toHaveBeenCalled();
        expect(mockMonitor.enable).toHaveBeenCalled();
      });
    });

    describe('validate()', () => {
      test('should succeed when mean delay is below threshold', async () => {
        const circuitBreaker = createCircuitBreaker({ thresholdMillis: 5 });
        const result = await circuitBreaker.validate();
        expectValidCircuitBreakerResult(result, 'EventLoopDelayCircuitBreaker');
      });

      test('should fail when mean delay exceeds threshold', async () => {
        mockMonitor.mean = 8000000; // 8ms in nanoseconds
        const circuitBreaker = createCircuitBreaker({ thresholdMillis: 5 });
        const result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'EventLoopDelayCircuitBreaker',
          'Event loop delay mean 8.00ms exceeds threshold'
        );
      });

      test('should disable and re-enable monitor during validation', async () => {
        const circuitBreaker = createCircuitBreaker();
        await circuitBreaker.validate();
        expect(mockMonitor.disable).toHaveBeenCalled();
        expect(mockMonitor.enable).toHaveBeenCalledTimes(2); // Once in constructor, once after validation
      });

      test('should convert nanoseconds to milliseconds correctly', async () => {
        mockMonitor.mean = 3500000; // 3.5ms in nanoseconds
        const circuitBreaker = createCircuitBreaker();
        await circuitBreaker.validate();
        const stats = circuitBreaker.stats() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(stats.mean).toBe(3.5);
      });
    });

    describe('stats()', () => {
      test('should return histogram data in milliseconds', async () => {
        const circuitBreaker = createCircuitBreaker();
        await circuitBreaker.validate();
        const stats = circuitBreaker.stats() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

        expect(stats).toMatchObject({
          min: 1, // 1ms
          max: 5, // 5ms
          mean: 2, // 2ms
          exceeds: 0,
          stddev: 0.5, // 0.5ms
          percentiles: {
            50: 2,
            75: 3,
            90: 4,
            95: 4,
            99: 4.5,
          },
        });
        expect(typeof stats.fromTimestamp).toBe('string');
        expect(typeof stats.lastUpdatedAt).toBe('string');
      });
    });

    describe('validationIntervalMs()', () => {
      test('should return configured validation interval', () => {
        const circuitBreaker = createCircuitBreaker({ validationIntervalMs: 8000 });
        expect(circuitBreaker.validationIntervalMs()).toBe(8000);
      });
    });

    describe('nsToMs conversion', () => {
      test('should convert nanoseconds to milliseconds correctly', async () => {
        expect(ONE_MILLISECOND_AS_NANOSECONDS).toBe(1_000_000);

        const circuitBreaker = createCircuitBreaker();
        mockMonitor.mean = 5_500_000; // 5.5ms in nanoseconds
        await circuitBreaker.validate();
        const stats = circuitBreaker.stats() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(stats.mean).toBe(5.5);
      });
    });
  });

  describe('EventLoopUtilizationCircuitBreaker', () => {
    const mockPerf = createMockPerformance();

    beforeEach(() => {
      Object.assign(mockPerformance, mockPerf);
      mockPerformance.eventLoopUtilization.mockReturnValue({
        idle: 500,
        active: 100,
        utilization: 0.2,
      });
    });

    const createCircuitBreaker = (configOverrides = {}) => {
      const config = createEventLoopUtilizationCircuitBreakerConfig(configOverrides);
      return new EventLoopUtilizationCircuitBreaker(config);
    };

    describe('constructor', () => {
      test('should initialize with start utilization', () => {
        createCircuitBreaker();
        expect(mockPerformance.eventLoopUtilization).toHaveBeenCalledWith();
      });
    });

    describe('validate()', () => {
      test('should succeed when active time is below threshold', async () => {
        mockPerformance.eventLoopUtilization
          .mockReturnValueOnce({
            idle: 900,
            active: 100,
            utilization: 0.1,
          })
          .mockReturnValueOnce({
            idle: 900,
            active: 500, // Below 1000ms threshold
            utilization: 0.35,
          });

        const circuitBreaker = createCircuitBreaker();
        const result = await circuitBreaker.validate();
        expectValidCircuitBreakerResult(result, 'EventLoopUtilizationCircuitBreaker');
      });

      test('should fail when active time exceeds threshold', async () => {
        mockPerformance.eventLoopUtilization
          .mockReturnValueOnce({
            idle: 500,
            active: 100,
            utilization: 0.2,
          })
          .mockReturnValueOnce({
            idle: 500,
            active: 1500, // Above 1000ms threshold
            utilization: 0.75,
          });

        const circuitBreaker = createCircuitBreaker();
        const result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'EventLoopUtilizationCircuitBreaker',
          'Event loop utilization exceeded: 1500'
        );
      });

      test('should handle edge case of exactly threshold value', async () => {
        mockPerformance.eventLoopUtilization
          .mockReturnValueOnce({
            idle: 500,
            active: 100,
            utilization: 0.2,
          })
          .mockReturnValueOnce({
            idle: 500,
            active: 1000, // Exactly at threshold
            utilization: 0.67,
          });

        const circuitBreaker = createCircuitBreaker();
        const result = await circuitBreaker.validate();
        expect(result.valid).toBe(true); // Should succeed when equal to threshold
      });
    });

    describe('stats()', () => {
      test('should return start utilization', () => {
        const startUtilization = {
          idle: 500,
          active: 100,
          utilization: 0.2,
        };
        mockPerformance.eventLoopUtilization.mockReturnValue(startUtilization);

        const circuitBreaker = createCircuitBreaker();
        const stats = circuitBreaker.stats();
        expect(stats).toEqual({ startUtilization });
      });
    });

    describe('validationIntervalMs()', () => {
      test('should return configured validation interval', () => {
        const circuitBreaker = createCircuitBreaker({ validationIntervalMs: 3000 });
        expect(circuitBreaker.validationIntervalMs()).toBe(3000);
      });
    });
  });

  describe('RssGrowthCircuitBreaker', () => {
    const createCircuitBreaker = (configOverrides = {}) => {
      const config = createRssGrowthCircuitBreakerConfig(configOverrides);
      return new RssGrowthCircuitBreaker(config);
    };

    const setupMemoryUsage = (rss: number) => {
      jest.spyOn(process, 'memoryUsage').mockReturnValue(createMockMemoryUsage({ rss }));
    };

    describe('constructor validation', () => {
      test('should accept valid maxRssGrowthPercent values', () => {
        expect(() => createCircuitBreaker()).not.toThrow();
      });

      test('should throw error for negative maxRssGrowthPercent', () => {
        expect(() => createCircuitBreaker({ maxRssGrowthPercent: -1 })).toThrow(
          'maxRssGrowthPercent must be between 0 and 100'
        );
      });

      test('should throw error for maxRssGrowthPercent over 100', () => {
        expect(() => createCircuitBreaker({ maxRssGrowthPercent: 101 })).toThrow(
          'maxRssGrowthPercent must be between 0 and 100'
        );
      });

      test('should initialize with current RSS as initial value', () => {
        const circuitBreaker = createCircuitBreaker();
        const stats = circuitBreaker.stats() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(stats.initialRss).toBe(100000000);
        expect(stats.maxRss).toBe(100000000);
        expect(stats.maxPercentGrowth).toBe(0);
      });
    });

    describe('validate()', () => {
      test('should succeed when RSS growth is below threshold', async () => {
        const circuitBreaker = createCircuitBreaker();
        setupMemoryUsage(130000000); // 30% growth (within 50% threshold)

        const result = await circuitBreaker.validate();
        expectValidCircuitBreakerResult(result, 'RssGrowthCircuitBreaker');
      });

      test('should fail when RSS growth exceeds threshold', async () => {
        const circuitBreaker = createCircuitBreaker();
        setupMemoryUsage(160000000); // 60% growth (above 50% threshold)

        const result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'RssGrowthCircuitBreaker',
          'RSS growth exceeded: 60.00% - max allowed: 50%'
        );
      });

      test('should handle RSS decrease gracefully', async () => {
        const circuitBreaker = createCircuitBreaker();
        setupMemoryUsage(80000000); // Decrease from 100MB

        const result = await circuitBreaker.validate();
        expect(result.valid).toBe(true); // Should succeed with negative growth
      });

      test('should track maximum RSS and growth values', async () => {
        const circuitBreaker = createCircuitBreaker({ maxRssGrowthPercent: 100 });

        // First increase
        setupMemoryUsage(120000000); // 20% growth
        await circuitBreaker.validate();

        // Second increase
        setupMemoryUsage(140000000); // 40% growth from initial
        await circuitBreaker.validate();

        const stats = circuitBreaker.stats() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(stats.maxRss).toBe(140000000);
        expect(stats.maxPercentGrowth).toBe(40);
      });

      test('should handle edge case of exactly threshold value', async () => {
        const circuitBreaker = createCircuitBreaker();
        setupMemoryUsage(150000000); // Exactly 50% growth

        const result = await circuitBreaker.validate();
        expect(result.valid).toBe(true); // Should succeed when equal to threshold
      });
    });

    describe('stats()', () => {
      test('should return current RSS statistics', async () => {
        const circuitBreaker = createCircuitBreaker();
        setupMemoryUsage(120000000); // 20% growth
        await circuitBreaker.validate();

        const stats = circuitBreaker.stats();
        expect(stats).toEqual({
          initialRss: 100000000,
          maxRss: 120000000,
          maxPercentGrowth: 20,
        });
      });
    });

    describe('validationIntervalMs()', () => {
      test('should return configured validation interval', () => {
        const circuitBreaker = createCircuitBreaker({ validationIntervalMs: 7000 });
        expect(circuitBreaker.validationIntervalMs()).toBe(7000);
      });
    });
  });

  describe('TimeoutCircuitBreaker', () => {
    beforeEach(() => {
      mockPerformance.now.mockReturnValue(1000); // Initial time
    });

    const createCircuitBreaker = (configOverrides = {}) => {
      const config = createTimeoutCircuitBreakerConfig(configOverrides);
      return new TimeoutCircuitBreaker(config);
    };

    describe('constructor', () => {
      test('should initialize with current performance time', () => {
        createCircuitBreaker();
        expect(mockPerformance.now).toHaveBeenCalled();
      });
    });

    describe('validate()', () => {
      test('should succeed when time elapsed is below timeout', async () => {
        mockPerformance.now
          .mockReturnValueOnce(1000) // Constructor
          .mockReturnValueOnce(3000); // Validation (2000ms elapsed)

        const circuitBreaker = createCircuitBreaker();
        const result = await circuitBreaker.validate();
        expectValidCircuitBreakerResult(result, 'TimeoutCircuitBreaker');
      });

      test('should fail when timeout is exceeded', async () => {
        mockPerformance.now
          .mockReturnValueOnce(1000) // Constructor
          .mockReturnValueOnce(7000); // Validation (6000ms elapsed, above 5000ms timeout)

        const circuitBreaker = createCircuitBreaker();
        const result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'TimeoutCircuitBreaker',
          'Timeout exceeded: 5000 ms'
        );
      });

      test('should handle edge case of exactly timeout value', async () => {
        mockPerformance.now
          .mockReturnValueOnce(1000) // Constructor
          .mockReturnValueOnce(6000); // Validation (5000ms elapsed, exactly at timeout)

        const circuitBreaker = createCircuitBreaker();
        const result = await circuitBreaker.validate();
        expect(result.valid).toBe(true); // Should succeed when equal to timeout
      });

      test('should handle zero timeout', async () => {
        mockPerformance.now
          .mockReturnValueOnce(1000) // Constructor
          .mockReturnValueOnce(1001); // Validation (1ms elapsed, above 0ms timeout)

        const circuitBreaker = createCircuitBreaker({ timeoutMillis: 0 });
        const result = await circuitBreaker.validate();
        expectInvalidCircuitBreakerResult(
          result,
          'TimeoutCircuitBreaker',
          'Timeout exceeded: 0 ms'
        );
      });

      test('should handle very large timeout values', async () => {
        mockPerformance.now
          .mockReturnValueOnce(1000) // Constructor
          .mockReturnValueOnce(100000); // Validation (99000ms elapsed)

        const circuitBreaker = createCircuitBreaker({ timeoutMillis: Number.MAX_SAFE_INTEGER });
        const result = await circuitBreaker.validate();
        expect(result.valid).toBe(true);
      });
    });

    describe('stats()', () => {
      test('should return start time and elapsed time', () => {
        mockPerformance.now
          .mockReturnValueOnce(1000) // Constructor
          .mockReturnValueOnce(3500); // Stats call

        const circuitBreaker = createCircuitBreaker();
        const stats = circuitBreaker.stats();
        expect(stats).toEqual({
          started: 1000,
          elapsed: 2500, // 3500 - 1000
        });
      });

      test('should calculate elapsed time correctly for multiple calls', async () => {
        mockPerformance.now
          .mockReturnValueOnce(1000) // Constructor
          .mockReturnValueOnce(2000) // validate call
          .mockReturnValueOnce(4000); // stats call

        const circuitBreaker = createCircuitBreaker();
        await circuitBreaker.validate();
        const stats = circuitBreaker.stats() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(stats.elapsed).toBe(3000);
      });
    });

    describe('validationIntervalMs()', () => {
      test('should return configured validation interval', () => {
        const circuitBreaker = createCircuitBreaker({ validationIntervalMs: 2000 });
        expect(circuitBreaker.validationIntervalMs()).toBe(2000);
      });
    });
  });
});
