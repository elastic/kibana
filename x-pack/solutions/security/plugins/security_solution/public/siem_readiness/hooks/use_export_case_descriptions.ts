/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSiemReadinessApi, useDetectionRulesByIntegration } from '@kbn/siem-readiness';
import type { MainCategories, RetentionInfo } from '@kbn/siem-readiness';
import { i18n } from '@kbn/i18n';
import { useBasePath } from '../../common/lib/kibana';
import { buildQualityCaseDescription } from '../pages/tabs/quality/quality_add_case_details';
import { buildContinuityCaseDescription } from '../pages/tabs/continuity/continuity_add_case_details';
import { buildRetentionCaseDescription } from '../pages/tabs/retention/retention_add_case_details';
import {
  isQualityIncompatible,
  isCriticalFailureRate,
  isRetentionNonCompliant,
  getFailureRateString,
} from './visibility_status_utils';
import type { CategoryData } from '../pages/components/category_accordion_table';

interface ExportCaseDescriptions {
  coverageDescription: string;
  hasCoverageIssues: boolean;
  dataCoverageDescription: string;
  hasDataCoverageIssues: boolean;
  qualityDescription: string;
  hasQualityIssues: boolean;
  continuityDescription: string;
  hasContinuityIssues: boolean;
  retentionDescription: string;
  hasRetentionIssues: boolean;
  isLoading: boolean;
}

const DATA_COVERAGE_CATEGORIES = [
  'Endpoint',
  'Identity',
  'Network',
  'Cloud',
  'Application/SaaS',
] as const;

const CATEGORY_TO_INTEGRATION_FILTER: Record<string, string> = {
  Cloud: 'cloudsecurity_cdr',
  Endpoint: 'edr_xdr',
  Identity: 'iam',
  Network: 'network_security',
  'Application/SaaS': 'siem',
};

export const useExportCaseDescriptions = (
  activeCategories: MainCategories[]
): ExportCaseDescriptions => {
  const basePath = useBasePath();
  const {
    getReadinessCategories,
    getIndexQualityResultsLatest,
    getReadinessPipelines,
    getReadinessRetention,
  } = useSiemReadinessApi();

  const { data: categoriesData, isLoading: categoriesLoading } = getReadinessCategories;
  const { data: qualityData, isLoading: qualityLoading } = getIndexQualityResultsLatest;
  const { data: pipelinesData, isLoading: pipelinesLoading } = getReadinessPipelines;
  const { data: retentionData, isLoading: retentionLoading } = getReadinessRetention;

  const isLoading = categoriesLoading || qualityLoading || pipelinesLoading || retentionLoading;

  // Build coverage case description
  const { ruleIntegrationCoverage } = useDetectionRulesByIntegration();

  const missingIntegrations = useMemo(
    () => ruleIntegrationCoverage?.missingIntegrations ?? [],
    [ruleIntegrationCoverage?.missingIntegrations]
  );

  const hasCoverageIssues = missingIntegrations.length > 0;

  const coverageDescription = useMemo(() => {
    if (!hasCoverageIssues) return '';

    const integrationLinks = missingIntegrations
      .map((integration) => {
        const url = `${basePath}/app/integrations/detail/${integration}`;
        return `- [${integration}](${window.location.origin}${url})`;
      })
      .join('\n');

    return i18n.translate(
      'xpack.securitySolution.siemReadiness.export.coverage.missingIntegrationsDescription',
      {
        defaultMessage:
          'The following rules have missing or disabled integrations, limiting visibility and detection coverage:\n\n{integrationLinks}\n\nPlease review and install or enable the necessary integrations to restore full visibility.',
        values: { integrationLinks },
      }
    );
  }, [missingIntegrations, basePath, hasCoverageIssues]);

  // Build data coverage case description (missing log categories)
  const missingDataCategories = useMemo(() => {
    if (!categoriesData?.mainCategoriesMap) return [];

    return DATA_COVERAGE_CATEGORIES.filter((category) => {
      const categoryData = categoriesData.mainCategoriesMap.find(
        (item) => item.category === category
      );
      const totalDocs = categoryData?.indices.reduce((sum, index) => sum + index.docs, 0) || 0;
      return totalDocs === 0;
    });
  }, [categoriesData?.mainCategoriesMap]);

  const hasDataCoverageIssues = missingDataCategories.length > 0;

  const dataCoverageDescription = useMemo(() => {
    if (!hasDataCoverageIssues) return '';

    const categoryLinks = missingDataCategories
      .map((category) => {
        const filter = CATEGORY_TO_INTEGRATION_FILTER[category];
        const url = `${basePath}/app/integrations/browse/security${filter ? `/${filter}` : ''}`;
        return `- [${category}](${window.location.origin}${url})`;
      })
      .join('\n');

    return i18n.translate(
      'xpack.securitySolution.siemReadiness.export.dataCoverage.missingCategoriesDescription',
      {
        defaultMessage:
          'The following log categories are missing required integrations, limiting visibility and detection coverage:\n\n{categoryLinks}\n\nPlease review and install the necessary integrations to restore full visibility.',
        values: { categoryLinks },
      }
    );
  }, [missingDataCategories, basePath, hasDataCoverageIssues]);

  // Build quality categories with status
  const qualityCategories = useMemo(() => {
    if (!categoriesData?.mainCategoriesMap || !qualityData) return [];

    const qualityMap = new Map(qualityData.map((result) => [result.indexName, result]));

    const activeOnly = categoriesData.mainCategoriesMap.filter((category) =>
      activeCategories.includes(category.category as MainCategories)
    );

    return activeOnly
      .map((category) => ({
        category: category.category,
        items: category.indices.map((index) => {
          const result = qualityMap.get(index.indexName);
          const incompatibleCount = result?.incompatibleFieldCount ?? 0;
          return {
            indexName: index.indexName,
            incompatibleFieldCount: incompatibleCount,
            status: isQualityIncompatible(incompatibleCount)
              ? ('incompatible' as const)
              : ('healthy' as const),
          };
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categoriesData?.mainCategoriesMap, qualityData, activeCategories]);

  const hasQualityIssues = useMemo(() => {
    return qualityCategories.some((category) =>
      category.items.some((item) => item.status === 'incompatible')
    );
  }, [qualityCategories]);

  const qualityDescription = useMemo(() => {
    if (!hasQualityIssues) return '';
    return buildQualityCaseDescription(qualityCategories, basePath);
  }, [qualityCategories, basePath, hasQualityIssues]);

  // Build continuity categories with status
  const continuityCategories = useMemo(() => {
    if (!categoriesData?.mainCategoriesMap || !pipelinesData?.length) return [];

    // Build index → category mapping
    const indexToCategoryMap = new Map<string, string>();
    categoriesData.mainCategoriesMap.forEach(({ category, indices }) => {
      indices.forEach(({ indexName }) => {
        indexToCategoryMap.set(indexName, category);
      });
    });

    const categoryPipelinesMap = new Map<string, Array<{
      name: string;
      docsCount: number;
      failedDocsCount: number;
      failureRate: string;
      status: 'healthy' | 'critical';
      indices: string[];
      statsAvailable: boolean;
    }>>();

    pipelinesData.forEach((pipeline) => {
      const failureRate = getFailureRateString(pipeline.failedDocsCount, pipeline.docsCount);

      const pipelineWithStats = {
        ...pipeline,
        failureRate,
        status: isCriticalFailureRate(pipeline.failedDocsCount, pipeline.docsCount)
          ? ('critical' as const)
          : ('healthy' as const),
      };

      const uniqueCategories = new Set<string>();
      pipeline.indices.forEach((indexName) => {
        const category = indexToCategoryMap.get(indexName);
        if (category) uniqueCategories.add(category);
      });

      uniqueCategories.forEach((category) => {
        const pipelinesInCategory = categoryPipelinesMap.get(category) || [];
        pipelinesInCategory.push(pipelineWithStats);
        categoryPipelinesMap.set(category, pipelinesInCategory);
      });
    });

    const result: Array<CategoryData<{
      name: string;
      docsCount: number;
      failedDocsCount: number;
      failureRate: string;
      status: 'healthy' | 'critical';
      indices: string[];
      statsAvailable: boolean;
    }>> = [];

    activeCategories.forEach((category) => {
      const items = categoryPipelinesMap.get(category);
      if (items) {
        result.push({ category, items });
      }
    });

    return result;
  }, [categoriesData?.mainCategoriesMap, pipelinesData, activeCategories]);

  const hasContinuityIssues = useMemo(() => {
    return continuityCategories.some((category) =>
      category.items.some((item) => item.status === 'critical')
    );
  }, [continuityCategories]);

  const continuityDescription = useMemo(() => {
    if (!hasContinuityIssues) return '';
    return buildContinuityCaseDescription(continuityCategories, basePath);
  }, [continuityCategories, basePath, hasContinuityIssues]);

  // Build retention categories with status
  const retentionCategories = useMemo(() => {
    if (!categoriesData?.mainCategoriesMap || !retentionData?.items?.length) return [];

    const result: Array<CategoryData<RetentionInfo & Record<string, unknown>>> = [];

    for (const category of categoriesData.mainCategoriesMap) {
      const isActive = activeCategories.includes(category.category as MainCategories);
      if (isActive) {
        const matchingRetention: Array<RetentionInfo & Record<string, unknown>> = [];
        for (const retention of retentionData.items) {
          const hasMatch = category.indices.some((idx) =>
            idx.indexName.includes(retention.indexName)
          );
          if (hasMatch) {
            matchingRetention.push(retention as RetentionInfo & Record<string, unknown>);
          }
        }

        if (matchingRetention.length > 0) {
          result.push({ category: category.category, items: matchingRetention });
        }
      }
    }

    return result;
  }, [categoriesData?.mainCategoriesMap, retentionData?.items, activeCategories]);

  const hasRetentionIssues = useMemo(() => {
    return retentionCategories.some((category) =>
      category.items.some((item) => isRetentionNonCompliant(item.status))
    );
  }, [retentionCategories]);

  const retentionDescription = useMemo(() => {
    if (!hasRetentionIssues) return '';
    return buildRetentionCaseDescription(retentionCategories, basePath);
  }, [retentionCategories, basePath, hasRetentionIssues]);

  return {
    coverageDescription,
    hasCoverageIssues,
    dataCoverageDescription,
    hasDataCoverageIssues,
    qualityDescription,
    hasQualityIssues,
    continuityDescription,
    hasContinuityIssues,
    retentionDescription,
    hasRetentionIssues,
    isLoading,
  };
};
