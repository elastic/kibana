/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  ActionableFinding,
  CategoriesResponse,
  CoveragePayload,
  MainCategories,
} from '@kbn/siem-readiness';
import { CATEGORY_ORDER, getCoverageStatus } from '@kbn/siem-readiness';

export const getCoverage = async ({
  logger: _logger,
  categoriesData,
  hasDetectionRules,
}: {
  logger: Logger;
  /** Pre-fetched categories result from the shared context — passed in to avoid a duplicate ES call */
  categoriesData: CategoriesResponse;
  /**
   * Whether any enabled detection rules exist. Derived from reverseMapResult by the caller
   * to avoid a savedObjectsClient query that lacks access to alert objects in the Agent Builder context.
   */
  hasDetectionRules: boolean;
}): Promise<CoveragePayload> => {
  // Pass undefined for ruleIntegrationCoverage — integration gap analysis requires
  // fleet package data which is not available here without the fleet plugin.
  const status = getCoverageStatus(categoriesData, hasDetectionRules, undefined);

  const actionableFindings: ActionableFinding[] = [];

  if (!hasDetectionRules) {
    actionableFindings.push({
      category: 'Endpoint',
      severity: 'WARNING',
      message: 'No enabled detection rules found. Enable rules to improve SIEM coverage.',
      resource: 'detection_rules',
    });
  }

  CATEGORY_ORDER.forEach((category) => {
    const categoryData = categoriesData?.mainCategoriesMap?.find((c) => c.category === category);
    const totalDocs = categoryData?.indices.reduce((sum, idx) => sum + idx.docs, 0) ?? 0;
    if (totalDocs === 0) {
      actionableFindings.push({
        category: category as MainCategories,
        severity: 'WARNING',
        message: `No data ingested for the ${category} category.`,
        resource: category,
      });
    }
  });

  const summary = buildCoverageSummary(
    status,
    categoriesData?.mainCategoriesMap?.length ?? 0,
    hasDetectionRules
  );

  return {
    status,
    summary,
    items: categoriesData?.mainCategoriesMap ?? [],
    actionableFindings,
  };
};

const buildCoverageSummary = (
  status: string,
  categoryCount: number,
  hasDetectionRules: boolean
): string => {
  if (status === 'noData') return 'No data ingested and no detection rules enabled.';
  if (!hasDetectionRules)
    return `Data is being ingested across ${categoryCount} categories but no detection rules are enabled.`;
  if (status === 'actionsRequired')
    return `Coverage gaps detected across ${categoryCount} categories. Some categories have no data.`;
  return `Coverage is healthy across all ${categoryCount} ingested categories.`;
};
