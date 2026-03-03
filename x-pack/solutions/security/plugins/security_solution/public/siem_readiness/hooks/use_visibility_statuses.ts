/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  useSiemReadinessApi,
  useDetectionRulesByIntegration,
  CATEGORY_ORDER,
} from '@kbn/siem-readiness';
import type {
  MainCategories,
  SiemReadinessPackageInfo,
  CategoriesResponse,
  DataQualityResultDocument,
  PipelineStats,
  RetentionResponse,
} from '@kbn/siem-readiness';

export type VisibilityStatus = 'healthy' | 'actionsRequired' | 'noData';

interface VisibilityStatuses {
  coverageStatus: VisibilityStatus;
  qualityStatus: VisibilityStatus;
  continuityStatus: VisibilityStatus;
  retentionStatus: VisibilityStatus;
}

interface RuleIntegrationCoverage {
  missingIntegrations?: string[];
}

/**
 * Check if the failure rate is critical (>= 1%)
 */
const isCriticalFailureRate = (failedDocsCount: number, docsCount: number): boolean => {
  if (docsCount === 0) return false;
  return (failedDocsCount / docsCount) * 100 >= 1;
};

/**
 * Build a map of index name to category for quick lookup
 */
const buildIndexToCategoryMap = (
  categoriesData: CategoriesResponse | undefined
): Map<string, string> => {
  const map = new Map<string, string>();
  if (!categoriesData?.mainCategoriesMap) return map;

  categoriesData.mainCategoriesMap.forEach(({ category, indices }) => {
    indices.forEach(({ indexName }) => map.set(indexName, category));
  });

  return map;
};

/**
 * Compute Coverage status based on rule coverage and data coverage
 */
const computeCoverageStatus = (
  categoriesData: CategoriesResponse | undefined,
  hasDetectionRules: boolean,
  ruleIntegrationCoverage: RuleIntegrationCoverage | undefined
): VisibilityStatus => {
  const hasCategories = Boolean(categoriesData?.mainCategoriesMap?.length);

  if (!hasCategories && !hasDetectionRules) return 'noData';

  const hasMissingIntegrations =
    hasDetectionRules && Boolean(ruleIntegrationCoverage?.missingIntegrations?.length);

  const hasMissingData =
    hasCategories &&
    CATEGORY_ORDER.some((category) => {
      const categoryData = categoriesData?.mainCategoriesMap?.find(
        (item) => item.category === category
      );
      const totalDocs = categoryData?.indices.reduce((sum, idx) => sum + idx.docs, 0) || 0;
      return totalDocs === 0;
    });

  return hasMissingIntegrations || hasMissingData ? 'actionsRequired' : 'healthy';
};

/**
 * Compute Quality status based on ECS compatibility
 */
const computeQualityStatus = (
  categoriesData: CategoriesResponse | undefined,
  qualityData: DataQualityResultDocument[] | undefined,
  activeCategories: MainCategories[]
): VisibilityStatus => {
  if (!categoriesData?.mainCategoriesMap || !qualityData) return 'noData';

  const qualityMap = new Map(qualityData.map((result) => [result.indexName, result]));

  let hasIncompatible = false;
  let hasData = false;

  categoriesData.mainCategoriesMap
    .filter((cat) => activeCategories.includes(cat.category as MainCategories))
    .forEach((category) => {
      category.indices.forEach((index) => {
        hasData = true;
        const result = qualityMap.get(index.indexName);
        if (result && result.incompatibleFieldCount > 0) {
          hasIncompatible = true;
        }
      });
    });

  if (!hasData) return 'noData';
  return hasIncompatible ? 'actionsRequired' : 'healthy';
};

/**
 * Compute Continuity status based on pipeline failure rates
 */
const computeContinuityStatus = (
  pipelinesData: PipelineStats[] | undefined,
  indexToCategoryMap: Map<string, string>,
  activeCategories: MainCategories[]
): VisibilityStatus => {
  if (!pipelinesData?.length) return 'noData';

  let hasCritical = false;
  let hasRelevantPipelines = false;

  pipelinesData.forEach((pipeline) => {
    const pipelineCategories = new Set<string>();
    pipeline.indices.forEach((indexName) => {
      const category = indexToCategoryMap.get(indexName);
      if (category) pipelineCategories.add(category);
    });

    const isInActiveCategory = Array.from(pipelineCategories).some((cat) =>
      activeCategories.includes(cat as MainCategories)
    );

    if (isInActiveCategory) {
      hasRelevantPipelines = true;
      if (isCriticalFailureRate(pipeline.failedDocsCount, pipeline.docsCount)) {
        hasCritical = true;
      }
    }
  });

  if (!hasRelevantPipelines) return 'noData';
  return hasCritical ? 'actionsRequired' : 'healthy';
};

/**
 * Compute Retention status based on compliance with retention requirements
 */
const computeRetentionStatus = (
  categoriesData: CategoriesResponse | undefined,
  retentionData: RetentionResponse | undefined,
  activeCategories: MainCategories[]
): VisibilityStatus => {
  if (!categoriesData?.mainCategoriesMap || !retentionData?.items?.length) return 'noData';

  let hasNonCompliant = false;
  let hasRelevantData = false;

  categoriesData.mainCategoriesMap
    .filter((cat) => activeCategories.includes(cat.category as MainCategories))
    .forEach((category) => {
      category.indices.forEach((index) => {
        const matchingRetention = retentionData.items.find((retention) =>
          index.indexName.includes(retention.indexName)
        );
        if (matchingRetention) {
          hasRelevantData = true;
          if (matchingRetention.status === 'non-compliant') {
            hasNonCompliant = true;
          }
        }
      });
    });

  if (!hasRelevantData) return 'noData';
  return hasNonCompliant ? 'actionsRequired' : 'healthy';
};

/**
 * Custom hook that computes visibility statuses for all four tabs
 * (Coverage, Quality, Continuity, Retention)
 */
export const useVisibilityStatuses = (activeCategories: MainCategories[]): VisibilityStatuses => {
  const {
    getReadinessCategories,
    getIndexQualityResultsLatest,
    getReadinessPipelines,
    getReadinessRetention,
    getIntegrations,
    getDetectionRules,
  } = useSiemReadinessApi();

  const { data: categoriesData } = getReadinessCategories;
  const { data: qualityData } = getIndexQualityResultsLatest;
  const { data: pipelinesData } = getReadinessPipelines;
  const { data: retentionData } = getReadinessRetention;

  // Coverage: Get installed integrations and use detection rules hook
  const installedIntegrations = useMemo(
    () =>
      getIntegrations?.data?.items?.filter(
        (pkg: SiemReadinessPackageInfo) => pkg.status === 'installed'
      ) || [],
    [getIntegrations?.data?.items]
  );

  const integrationNames = useMemo(
    () => installedIntegrations.map((item) => item.name),
    [installedIntegrations]
  );

  const { ruleIntegrationCoverage } = useDetectionRulesByIntegration(integrationNames);

  // Build index → category mapping for continuity status
  const indexToCategoryMap = useMemo(
    () => buildIndexToCategoryMap(categoriesData),
    [categoriesData]
  );

  const coverageStatus = useMemo(
    () =>
      computeCoverageStatus(
        categoriesData,
        Boolean(getDetectionRules.data?.data?.length),
        ruleIntegrationCoverage ?? undefined
      ),
    [categoriesData, getDetectionRules.data?.data?.length, ruleIntegrationCoverage]
  );

  const qualityStatus = useMemo(
    () => computeQualityStatus(categoriesData, qualityData, activeCategories),
    [categoriesData, qualityData, activeCategories]
  );

  const continuityStatus = useMemo(
    () => computeContinuityStatus(pipelinesData, indexToCategoryMap, activeCategories),
    [pipelinesData, indexToCategoryMap, activeCategories]
  );

  const retentionStatus = useMemo(
    () => computeRetentionStatus(categoriesData, retentionData, activeCategories),
    [categoriesData, retentionData, activeCategories]
  );

  return {
    coverageStatus,
    qualityStatus,
    continuityStatus,
    retentionStatus,
  };
};
