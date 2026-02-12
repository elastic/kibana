/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CategoryData } from '../../components/category_accordion_table';
import type { RetentionStatus } from '@kbn/siem-readiness';

// Item with retention data (can be RetentionInfo or IndexInfo extended with retention fields)
interface RetentionItemData {
  indexName: string;
  retentionDays: number | null;
  policyName: string | null;
  status: RetentionStatus;
}

export const buildRetentionCaseDescription = (
  categories: Array<CategoryData<RetentionItemData>>,
  basePath: string
): string => {
  const ilmPoliciesUrl = `${window.location.origin}${basePath}/app/management/data/index_lifecycle_management/policies`;

  // Build the list of data streams with issues grouped by category
  const categoryDetails = categories
    .map((category) => {
      const issueStreams = category.items.filter(
        (item) => item.status === 'non-compliant' || item.status === 'unknown'
      );

      if (issueStreams.length === 0) {
        return null;
      }

      const streamsList = issueStreams
        .map((item) => {
          const retentionInfo =
            item.retentionDays !== null
              ? `${item.retentionDays} days`
              : item.status === 'unknown'
              ? 'No policy'
              : 'Unknown';
          const policyInfo = item.policyName ? ` - Policy: ${item.policyName}` : '';
          return `  - \`${item.indexName}\` (${retentionInfo}${policyInfo})`;
        })
        .join('\n');

      return `**${category.category}:**\n${streamsList}`;
    })
    .filter(Boolean)
    .join('\n\n');

  const totalNonCompliant = categories.reduce(
    (sum, category) => sum + category.items.filter((item) => item.status === 'non-compliant').length,
    0
  );

  const totalUnknown = categories.reduce(
    (sum, category) => sum + category.items.filter((item) => item.status === 'unknown').length,
    0
  );

  const totalIssues = totalNonCompliant + totalUnknown;

  return i18n.translate(
    'xpack.securitySolution.siemReadiness.retention.caseDescription.template',
    {
      defaultMessage: `Review the Index Lifecycle Management policies to ensure adequate data retention:

[View ILM Policies]({ilmPoliciesUrl})

## Data Streams with Retention Issues

{totalIssues, plural, one {# data stream has} other {# data streams have}} retention issues that need attention:

- **Non-compliant (< 365 days):** {totalNonCompliant}
- **No policy configured:** {totalUnknown}

{categoryDetails}

## Recommended Actions

1. Review each affected data stream's retention configuration
2. Update ILM policies to meet the 365-day retention threshold
3. Configure retention policies for data streams without one
4. Consider compliance requirements (e.g., FedRAMP) when setting retention periods

Proper data retention is critical for security investigations, compliance audits, and forensic analysis. Ensure all security-relevant data is retained for the recommended period.`,
      values: {
        ilmPoliciesUrl,
        totalIssues,
        totalNonCompliant,
        totalUnknown,
        categoryDetails,
      },
    }
  );
};

export const getRetentionCaseTitle = (): string => {
  return i18n.translate('xpack.securitySolution.siemReadiness.retention.caseTitle', {
    defaultMessage: 'Data Retention: Policy Configuration Issues',
  });
};
