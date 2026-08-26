/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  CATEGORY_ORDER,
  getCoverageStatus,
  getQualityStatus,
  getContinuityStatus,
  getRetentionStatus,
  getIndexCategoryMap,
} from '@kbn/siem-readiness';
import type { MainCategories, VisibilityStatus } from '@kbn/siem-readiness';
import { useSiemReadinessApi } from './use_siem_readiness_api';
import { useDetectionRulesByIntegration } from './use_get_detection_rules_by_integration';

export type { VisibilityStatus };

interface VisibilityStatuses {
  coverageStatus: VisibilityStatus;
  qualityStatus: VisibilityStatus;
  continuityStatus: VisibilityStatus;
  retentionStatus: VisibilityStatus;
}

export const useVisibilityStatuses = (activeCategories: MainCategories[]): VisibilityStatuses => {
  const {
    getReadinessCategories,
    getIndexQualityResultsLatest,
    getReadinessPipelines,
    getReadinessRetention,
    getDetectionRules,
  } = useSiemReadinessApi();

  const { data: categoriesData } = getReadinessCategories;
  const { data: qualityData } = getIndexQualityResultsLatest;
  const { data: pipelinesData } = getReadinessPipelines;
  const { data: retentionData } = getReadinessRetention;

  const { ruleIntegrationCoverage } = useDetectionRulesByIntegration();

  const indexToCategoryMap = useMemo(() => getIndexCategoryMap(categoriesData), [categoriesData]);

  const coverageStatus = useMemo(
    () =>
      getCoverageStatus(
        categoriesData,
        Boolean(getDetectionRules.data?.data?.length),
        ruleIntegrationCoverage ?? undefined
      ),
    [categoriesData, getDetectionRules.data?.data?.length, ruleIntegrationCoverage]
  );

  const qualityStatus = useMemo(
    () => getQualityStatus(categoriesData, qualityData, activeCategories),
    [categoriesData, qualityData, activeCategories]
  );

  const continuityStatus = useMemo(
    () => getContinuityStatus(pipelinesData?.items, indexToCategoryMap, activeCategories),
    [pipelinesData?.items, indexToCategoryMap, activeCategories]
  );

  const retentionStatus = useMemo(
    () => getRetentionStatus(categoriesData, retentionData, activeCategories),
    [categoriesData, retentionData, activeCategories]
  );

  return {
    coverageStatus,
    qualityStatus,
    continuityStatus,
    retentionStatus,
  };
};

// Re-export for backward compatibility with files in the same hooks directory
export { CATEGORY_ORDER };
