/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CategoryData } from '../../components/category_accordion_table';
import { isCriticalFailureRate } from './continuity_tab';
import type { PipelineInfoWithStatus } from './continuity_tab';

export const buildContinuityCaseDescription = (
  categories: Array<CategoryData<PipelineInfoWithStatus>>,
  basePath: string
): string => {
  const ingestPipelinesUrl = `${window.location.origin}${basePath}/app/management/ingest/ingest_pipelines`;

  // Build the list of failing pipelines grouped by category
  const categoryDetails = categories
    .map((category) => {
      const failingPipelines = category.items.filter((item) =>
        isCriticalFailureRate(item.failureRate)
      );

      if (failingPipelines.length === 0) {
        return null;
      }

      const pipelinesList = failingPipelines
        .map(
          (item) =>
            `  - \`${item.name}\` (${item.failedDocsCount.toLocaleString()} failed docs, ${
              item.failureRate
            }% failure rate)`
        )
        .join('\n');

      return `**${category.category}:**\n${pipelinesList}`;
    })
    .filter(Boolean)
    .join('\n\n');

  const totalFailingPipelines = categories.reduce(
    (sum, category) =>
      sum + category.items.filter((item) => isCriticalFailureRate(item.failureRate)).length,
    0
  );

  const totalFailedDocs = categories.reduce(
    (sum, category) =>
      sum + category.items.reduce((catSum, item) => catSum + item.failedDocsCount, 0),
    0
  );

  return i18n.translate(
    'xpack.securitySolution.siemReadiness.continuity.caseDescription.template',
    {
      defaultMessage: `Review the Ingest Pipelines in Stack Management to identify and resolve ingest failures:

[View Ingest Pipelines]({ingestPipelinesUrl})

## Pipelines with Ingest Failures

{totalFailingPipelines, plural, one {# pipeline has} other {# pipelines have}} ingest failures ({totalFailedDocs} total failed documents) that need attention:

{categoryDetails}

## Recommended Actions

1. Review each failing pipeline in Stack Management
2. Check the pipeline processor configurations for errors
3. Examine failed document samples to identify parsing issues
4. Update pipeline configurations to handle edge cases
5. Consider adding on_failure handlers to prevent data loss

Ingest failures can result in missing security data, reducing visibility and detection coverage. Address these issues to ensure complete data ingestion.`,
      values: {
        ingestPipelinesUrl,
        totalFailingPipelines,
        totalFailedDocs: totalFailedDocs.toLocaleString(),
        categoryDetails,
      },
    }
  );
};

export const getContinuityCaseTitle = (): string => {
  return i18n.translate('xpack.securitySolution.siemReadiness.continuity.caseTitle', {
    defaultMessage: 'Data Continuity: Ingest Pipeline Failures',
  });
};

export const getContinuityCaseTags = (): string[] => {
  return ['siem-readiness', 'data-continuity', 'ingest-pipelines'];
};
