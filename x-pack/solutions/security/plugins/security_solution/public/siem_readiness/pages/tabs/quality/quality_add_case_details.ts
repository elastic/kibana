/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CategoryData } from '../../components/category_accordion_table';

interface IndexInfoWithStatus {
  indexName: string;
  incompatibleFieldCount: number;
  status: 'incompatible' | 'healthy';
}

export const buildQualityCaseDescription = (
  categories: Array<CategoryData<IndexInfoWithStatus>>,
  basePath: string
): string => {
  const dataQualityDashboardUrl = `${window.location.origin}${basePath}/app/security/data_quality`;

  // Build the list of incompatible indices grouped by category
  const categoryDetails = categories
    .map((category) => {
      const incompatibleIndices = category.items.filter((item) => item.status === 'incompatible');

      if (incompatibleIndices.length === 0) {
        return null;
      }

      const indicesList = incompatibleIndices
        .map(
          (item) =>
            `  - \`${item.indexName}\` (${item.incompatibleFieldCount} incompatible field${
              item.incompatibleFieldCount > 1 ? 's' : ''
            })`
        )
        .join('\n');

      return `**${category.category}:**\n${indicesList}`;
    })
    .filter(Boolean)
    .join('\n\n');

  const totalIncompatibleIndices = categories.reduce(
    (sum, category) => sum + category.items.filter((item) => item.status === 'incompatible').length,
    0
  );

  return i18n.translate('xpack.securitySolution.siemReadiness.quality.caseDescription.template', {
    defaultMessage: `Review the Data Quality Dashboard to identify and resolve ECS compatibility issues:

[View Data Quality Dashboard]({dataQualityDashboardUrl})

## Indices with ECS Compatibility Issues

{totalIncompatibleIndices, plural, one {# data source has} other {# data sources have}} ECS compatibility issues that need attention:

{categoryDetails}

## Recommended Actions

1. Review each affected data source in the Data Quality Dashboard
2. Identify the incompatible fields and their mapping issues
3. Update field mappings to align with ECS standards
4. Verify that schema changes don't break existing queries and dashboards

Schema errors can stop rules, dashboards, and correlations from working correctly. Address these issues to ensure full security visibility and detection coverage.`,
    values: {
      dataQualityDashboardUrl,
      totalIncompatibleIndices,
      categoryDetails,
    },
  });
};

export const getQualityCaseTitle = (): string => {
  return i18n.translate('xpack.securitySolution.siemReadiness.quality.caseTitle', {
    defaultMessage: 'Data Quality: ECS Compatibility Issues',
  });
};
