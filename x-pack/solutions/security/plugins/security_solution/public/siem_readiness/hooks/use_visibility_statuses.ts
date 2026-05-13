/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSiemReadinessApi } from '@kbn/siem-readiness';
import type {
  MainCategories,
  CompiledCoverageData,
  CompiledContinuityData,
  CompiledRetentionData,
  CompiledQualityData,
} from '@kbn/siem-readiness';

export type VisibilityStatus = 'healthy' | 'actionsRequired' | 'noData';

interface VisibilityStatuses {
  coverageStatus: VisibilityStatus;
  qualityStatus: VisibilityStatus;
  continuityStatus: VisibilityStatus;
  retentionStatus: VisibilityStatus;
}

/**
 * Compute Coverage status based on compiled coverage data.
 */
const computeCoverageStatus = (
  coverageData: CompiledCoverageData | undefined
): VisibilityStatus => {
  if (!coverageData?.categories?.length) return 'noData';

  const hasMissingData = coverageData.summary.inactiveCategories.length > 0;
  const hasMissingIntegrations = coverageData.categories.some(
    (c) => c.missingIntegrations.length > 0
  );

  if (hasMissingData || hasMissingIntegrations) return 'actionsRequired';
  return coverageData.summary.activeCategories.length > 0 ? 'healthy' : 'noData';
};

/**
 * Compute Quality status based on compiled quality data.
 * Uses the pre-computed byCategory grouping to check active categories only.
 */
const computeQualityStatus = (
  qualityData: CompiledQualityData | undefined,
  activeCategories: MainCategories[]
): VisibilityStatus => {
  if (!qualityData?.byCategory?.length) return 'noData';

  const relevantCategories = qualityData.byCategory.filter(
    (cat) => activeCategories.includes(cat.category as MainCategories) && cat.totalActiveIndices > 0
  );

  if (!relevantCategories.length) return 'noData';
  return relevantCategories.some((cat) => cat.incompatibleCount > 0)
    ? 'actionsRequired'
    : 'healthy';
};

/**
 * Compute Continuity status based on compiled pipeline data.
 * Uses the pre-computed byCategory grouping to check active categories only.
 */
const computeContinuityStatus = (
  pipelinesData: CompiledContinuityData | undefined,
  activeCategories: MainCategories[]
): VisibilityStatus => {
  if (!pipelinesData?.byCategory?.length) return 'noData';

  const relevantCategories = pipelinesData.byCategory.filter(
    (cat) => activeCategories.includes(cat.category as MainCategories) && cat.pipelineCount > 0
  );

  if (!relevantCategories.length) return 'noData';
  return relevantCategories.some((cat) => cat.criticalCount > 0) ? 'actionsRequired' : 'healthy';
};

/**
 * Compute Retention status based on compiled retention data.
 * Uses the pre-computed byCategory grouping to check active categories only.
 */
const computeRetentionStatus = (
  retentionData: CompiledRetentionData | undefined,
  activeCategories: MainCategories[]
): VisibilityStatus => {
  if (!retentionData?.byCategory?.length) return 'noData';

  const relevantCategories = retentionData.byCategory.filter(
    (cat) => activeCategories.includes(cat.category as MainCategories) && cat.totalIndices > 0
  );

  if (!relevantCategories.length) return 'noData';
  return relevantCategories.some((cat) => cat.nonCompliantCount > 0)
    ? 'actionsRequired'
    : 'healthy';
};

/**
 * Custom hook that computes visibility statuses for all four tabs
 * (Coverage, Quality, Continuity, Retention)
 */
export const useVisibilityStatuses = (activeCategories: MainCategories[]): VisibilityStatuses => {
  const {
    getReadinessCoverage,
    getReadinessQuality,
    getReadinessPipelines,
    getReadinessRetention,
  } = useSiemReadinessApi();

  const { data: coverageData } = getReadinessCoverage;
  const { data: qualityData } = getReadinessQuality;
  const { data: pipelinesData } = getReadinessPipelines;
  const { data: retentionData } = getReadinessRetention;

  const coverageStatus = useMemo(() => computeCoverageStatus(coverageData), [coverageData]);

  const qualityStatus = useMemo(
    () => computeQualityStatus(qualityData, activeCategories),
    [qualityData, activeCategories]
  );

  const continuityStatus = useMemo(
    () => computeContinuityStatus(pipelinesData, activeCategories),
    [pipelinesData, activeCategories]
  );

  const retentionStatus = useMemo(
    () => computeRetentionStatus(retentionData, activeCategories),
    [retentionData, activeCategories]
  );

  return {
    coverageStatus,
    qualityStatus,
    continuityStatus,
    retentionStatus,
  };
};
