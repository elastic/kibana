/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PipelineStats,
  LatencyStatus,
  CompiledPipeline,
  CompiledContinuityData,
} from '@kbn/siem-readiness-common';
import {
  SIEM_READINESS_CATEGORIES,
  CRITICAL_FAILURE_RATE_THRESHOLD,
  LATENCY_SLA_MS,
  LATENCY_SLA_DEFAULT_MS,
  getPipelineStatus,
  getFailureRateString,
} from '@kbn/siem-readiness-common';
import type { CategoriesData } from './fetch_categories';

export type { CompiledPipeline, CompiledContinuityData };

export interface CompiledContinuityOptions {
  category?: string;
  criticalOnly?: boolean;
}

/**
 * Compiles raw pipeline stats and category data into the final continuity report.
 * Pure function — no I/O. Used by both the agent tool and the HTTP route handler.
 */
export const compileContinuityData = (
  pipelines: PipelineStats[],
  categoriesData: CategoriesData,
  isServerless: boolean,
  options: CompiledContinuityOptions = {}
): CompiledContinuityData => {
  const { category, criticalOnly = false } = options;
  const { indexToCategoryMap } = categoriesData;

  const statsAvailable = !isServerless;

  const targetCategories = category ? [category] : [...SIEM_READINESS_CATEGORIES];

  const byCategory = targetCategories.map((cat) => {
    const slaMs = LATENCY_SLA_MS[cat] ?? LATENCY_SLA_DEFAULT_MS;

    const pipelinesInCategory: CompiledPipeline[] = pipelines
      .filter((p) => p.indices.some((idx) => indexToCategoryMap.get(idx) === cat))
      .map((p) => {
        const latencyP95Ms = p.volume?.latencyP95Ms ?? null;
        let latencyStatus: LatencyStatus = 'unknown';
        if (latencyP95Ms !== null) {
          latencyStatus =
            latencyP95Ms <= slaMs ? 'ok' : latencyP95Ms <= slaMs * 2 ? 'warning' : 'critical';
        }
        return {
          ...p,
          failureRate: getFailureRateString(p.failedDocsCount, p.docsCount),
          status: getPipelineStatus(p.failedDocsCount, p.docsCount),
          statsAvailable,
          latencySlaMs: slaMs,
          latencyStatus,
        };
      });

    const filtered = criticalOnly
      ? pipelinesInCategory.filter((p) => p.status === 'critical')
      : pipelinesInCategory;

    return {
      category: cat,
      pipelineCount: pipelinesInCategory.length,
      criticalCount: pipelinesInCategory.filter((p) => p.status === 'critical').length,
      pipelines: filtered,
    };
  });

  const allPipelines = byCategory.flatMap((c) => c.pipelines);
  const totalCritical = byCategory.reduce((sum, c) => sum + c.criticalCount, 0);
  const totalPipelines = byCategory.reduce((sum, c) => sum + c.pipelineCount, 0);
  const silentPipelines = allPipelines.filter((p) => p.volume?.silenceDetected).length;
  const criticalSilencePipelines = allPipelines.filter((p) => p.volume?.criticalSilence).length;
  const latencyBreachPipelines = allPipelines.filter(
    (p) => p.latencyStatus === 'warning' || p.latencyStatus === 'critical'
  ).length;

  return {
    summary: {
      totalPipelines,
      criticalPipelines: totalCritical,
      healthyPipelines: totalPipelines - totalCritical,
      statsAvailable,
      criticalThreshold: `${CRITICAL_FAILURE_RATE_THRESHOLD}%`,
      silentPipelines,
      criticalSilencePipelines,
      latencyBreachPipelines,
    },
    byCategory,
  };
};
