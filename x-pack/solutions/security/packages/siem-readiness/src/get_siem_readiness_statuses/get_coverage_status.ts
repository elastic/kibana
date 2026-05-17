/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategoriesResponse, VisibilityStatus } from '../types';
import { CATEGORY_ORDER } from '../constants';
import { hasMissingIntegrations } from './status_check_helpers';

interface RuleIntegrationCoverage {
  missingIntegrations?: string[];
}

export const getCoverageStatus = (
  categoriesData: CategoriesResponse | undefined,
  hasDetectionRules: boolean,
  ruleIntegrationCoverage: RuleIntegrationCoverage | undefined
): VisibilityStatus => {
  const hasCategories = Boolean(categoriesData?.mainCategoriesMap?.length);

  if (!hasCategories && !hasDetectionRules) return 'noData';
  if (hasCategories && !hasDetectionRules) return 'actionsRequired';

  const hasMissing =
    hasDetectionRules && hasMissingIntegrations(ruleIntegrationCoverage?.missingIntegrations);

  const hasMissingData =
    hasCategories &&
    CATEGORY_ORDER.some((category) => {
      const categoryData = categoriesData?.mainCategoriesMap?.find(
        (item) => item.category === category
      );
      const totalDocs = categoryData?.indices.reduce((sum, idx) => sum + idx.docs, 0) || 0;
      return totalDocs === 0;
    });

  return hasMissing || hasMissingData ? 'actionsRequired' : 'healthy';
};
