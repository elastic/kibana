/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HealthStatus } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  CircuitBreaker,
  CircuitBreakerResult,
} from '../health_diagnostic_circuit_breakers.types';
import { failure, success } from './utils';

export class ElasticsearchCircuitBreaker implements CircuitBreaker {
  private lastHealth: HealthStatus = 'green';
  private lastJvmStats: Record<string, unknown> | undefined;
  private lastCpuStats: Record<string, unknown> | undefined;

  constructor(
    private readonly config: {
      maxJvmHeapUsedPercent: number;
      maxCpuPercent: number;
      expectedClusterHealth: string[];
      validationIntervalMs: number;
    },
    private readonly client: ElasticsearchClient
  ) {}

  async validate(): Promise<CircuitBreakerResult> {
    try {
      const healthResp = await this.client.cluster.health();
      this.lastHealth = healthResp.status;
      const status = this.lastHealth;

      if (!this.config.expectedClusterHealth.includes(status as string)) {
        return failure(`Elasticsearch cluster health is ${status}`);
      }

      const nodesResp = await this.client.nodes.stats({
        metric: ['jvm', 'os'],
      });

      this.lastJvmStats = {};
      this.lastCpuStats = {};

      for (const nodeId of Object.keys(nodesResp.nodes)) {
        const node = nodesResp.nodes[nodeId];

        const jvm = node.jvm;
        const os = node.os;

        if (jvm?.mem?.heap_used_percent && os?.cpu?.percent) {
          const heapUsedPercent = jvm.mem.heap_used_percent;
          const cpuPercent = os.cpu.percent;

          this.lastJvmStats[nodeId] = heapUsedPercent;
          this.lastCpuStats[nodeId] = cpuPercent;

          if (heapUsedPercent > this.config.maxJvmHeapUsedPercent) {
            return failure(`Node ${nodeId} JVM heap used ${heapUsedPercent}% exceeds threshold`);
          }

          if (cpuPercent > this.config.maxCpuPercent) {
            return failure(`Node ${nodeId} CPU usage ${cpuPercent}% exceeds threshold`);
          }
        }
      }

      return success();
    } catch (error) {
      return failure(`Failed to get ES cluster or node stats: ${(error as Error).message}`);
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
