/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineStats } from '@kbn/siem-readiness-common';
import {
  SIEM_READINESS_CATEGORIES,
  CRITICAL_FAILURE_RATE_THRESHOLD,
  getPipelineStatus,
  getFailureRateString,
} from '@kbn/siem-readiness-common';
import type { CategoriesData } from './fetch_categories';

export interface CompiledContinuityOptions {
  category?: string;
  criticalOnly?: boolean;
}

export interface CompiledPipeline extends PipelineStats {
  failureRate: string;
  status: 'critical' | 'healthy';
  statsAvailable: boolean;
}

export interface CompiledContinuityData {
  summary: {
    totalPipelines: number;
    criticalPipelines: number;
    healthyPipelines: number;
    statsAvailable: boolean;
    criticalThreshold: string;
  };
  byCategory: Array<{
    category: string;
    pipelineCount: number;
    criticalCount: number;
    pipelines: CompiledPipeline[];
  }>;
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

  const compiledPipelines: CompiledPipeline[] = pipelines.map((p) => ({
    ...p,
    failureRate: getFailureRateString(p.failedDocsCount, p.docsCount),
    status: getPipelineStatus(p.failedDocsCount, p.docsCount),
    statsAvailable,
  }));

  const targetCategories = category ? [category] : [...SIEM_READINESS_CATEGORIES];

  const byCategory = targetCategories.map((cat) => {
    const pipelinesInCategory = compiledPipelines.filter((p) =>
      p.indices.some((idx) => indexToCategoryMap.get(idx) === cat)
    );
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

  const totalCritical = byCategory.reduce((sum, c) => sum + c.criticalCount, 0);
  const totalPipelines = byCategory.reduce((sum, c) => sum + c.pipelineCount, 0);

  return {
    summary: {
      totalPipelines,
      criticalPipelines: totalCritical,
      healthyPipelines: totalPipelines - totalCritical,
      statsAvailable,
      criticalThreshold: `${CRITICAL_FAILURE_RATE_THRESHOLD}%`,
    },
    byCategory,
  };
};
