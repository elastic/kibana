/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HealthStatus } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { CircuitBreakerResult } from '../health_diagnostic_circuit_breakers.types';
import { BaseCircuitBreaker } from './utils';

/**
 * Configuration interface for Elasticsearch Circuit Breaker.
 */
export interface ElasticsearchCircuitBreakerConfig {
  /** Maximum allowed JVM heap usage percentage. */
  maxJvmHeapUsedPercent: number;
  /** Maximum allowed CPU usage percentage. */
  maxCpuPercent: number;
  /** Expected cluster health statuses that allow query execution. */
  expectedClusterHealth: string[];
  /** Interval in milliseconds between cluster health validations. */
  validationIntervalMs: number;
}

export class ElasticsearchCircuitBreaker extends BaseCircuitBreaker {
  private lastHealth: HealthStatus = 'green';
  private lastJvmStats: Record<string, unknown> | undefined;
  private lastCpuStats: Record<string, unknown> | undefined;
  private nodeTimestamps: Record<string, number> = {};

  constructor(
    private readonly config: ElasticsearchCircuitBreakerConfig,
    private readonly client: ElasticsearchClient
  ) {
    super();
    if (config.maxJvmHeapUsedPercent < 0 || config.maxJvmHeapUsedPercent > 100) {
      throw new Error('maxJvmHeapUsedPercent must be between 0 and 100');
    }
  }

  async validate(): Promise<CircuitBreakerResult> {
    try {
      const healthResp = await this.client.cluster.health();
      this.lastHealth = healthResp.status;
      const status = this.lastHealth;

      if (!this.config.expectedClusterHealth.includes(status as string)) {
        return this.failure(`Elasticsearch cluster health is ${status}`);
      }

      const nodesResp = await this.client.nodes.stats({
        metric: ['jvm', 'os'],
      });

      if (!nodesResp.nodes || Object.keys(nodesResp.nodes).length === 0) {
        return this.failure('No Elasticsearch nodes found');
      }

      this.lastJvmStats = {};
      this.lastCpuStats = {};

      for (const nodeId of Object.keys(nodesResp.nodes)) {
        const node = nodesResp.nodes[nodeId];
        const currentTimestamp = node.timestamp;
        const lastReportedTimestamp = this.nodeTimestamps[nodeId];

        if (currentTimestamp === undefined || lastReportedTimestamp === currentTimestamp) {
          return this.failure(
            `Node ${nodeId} is stale: no timestamp updates detected. Current timestamp=${currentTimestamp}, Last reported timestamp=${lastReportedTimestamp}`
          );
        }

        this.nodeTimestamps[nodeId] = currentTimestamp;

        const jvm = node.jvm;
        const os = node.os;

        if (jvm?.mem?.heap_used_percent !== undefined && os?.cpu?.percent !== undefined) {
          const heapUsedPercent = jvm.mem.heap_used_percent;
          const cpuPercent = os.cpu.percent;

          this.lastJvmStats[nodeId] = heapUsedPercent;
          this.lastCpuStats[nodeId] = cpuPercent;

          if (heapUsedPercent > this.config.maxJvmHeapUsedPercent) {
            return this.failure(
              `Node ${nodeId} JVM heap used ${heapUsedPercent}% exceeds threshold`
            );
          }

          if (cpuPercent > this.config.maxCpuPercent) {
            return this.failure(`Node ${nodeId} CPU usage ${cpuPercent}% exceeds threshold`);
          }
        } else {
          return this.failure(`Node ${nodeId} missing metrics. JVM: ${jvm?.mem}, OS: ${os?.cpu}`);
        }
      }

      return this.success();
    } catch (error) {
      return this.failure(`Failed to get ES cluster or node stats: ${(error as Error).message}`);
    }
  }

  stats(): unknown {
    return {
      clusterHealth: this.lastHealth,
      jvmHeapUsedPercentPerNode: this.lastJvmStats,
      cpuPercentPerNode: this.lastCpuStats,
    };
  }

  validationIntervalMs(): number {
    return this.config.validationIntervalMs;
  }
}
