/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ActionableFinding, ContinuityPayload, MainCategories } from '@kbn/siem-readiness';
import {
  ALL_CATEGORIES,
  getContinuityStatus,
  getIndexCategoryMap,
  isCriticalFailureRate,
} from '@kbn/siem-readiness';
import { fetchCategories, fetchPipelines } from '../fetchers';

export const getContinuity = async ({
  esClient,
  isServerless,
  logger,
}: {
  esClient: ElasticsearchClient;
  isServerless: boolean;
  logger: Logger;
}): Promise<ContinuityPayload> => {
  const [pipelines, categoriesData] = await Promise.all([
    fetchPipelines({ esClient, isServerless, logger }),
    fetchCategories({ esClient, logger }),
  ]);

  const indexToCategoryMap = getIndexCategoryMap(categoriesData);
  const status = getContinuityStatus(pipelines, indexToCategoryMap, ALL_CATEGORIES);

  const actionableFindings: ActionableFinding[] = pipelines
    .filter((p) => isCriticalFailureRate(p.failedDocsCount, p.docsCount))
    .map((p) => {
      const pipelineCategories = new Set<string>();
      p.indices.forEach((indexName) => {
        const cat = indexToCategoryMap.get(indexName);
        if (cat) pipelineCategories.add(cat);
      });
      const category = (pipelineCategories.values().next().value as MainCategories) ?? 'Endpoint';
      return {
        category,
        severity: 'critical' as const,
        message: `Pipeline ${p.name} has a critical document failure rate (${p.failedDocsCount} of ${p.docsCount} failed)`,
        resource: p.name,
      };
    });

  const summary = buildContinuitySummary(status, pipelines.length, actionableFindings.length);

  return { status, summary, items: pipelines, actionableFindings };
};

const buildContinuitySummary = (
  status: string,
  pipelineCount: number,
  criticalCount: number
): string => {
  if (status === 'noData') return 'No active ingest pipelines found.';
  if (criticalCount > 0) {
    return `${criticalCount} of ${pipelineCount} pipelines have critical failure rates and require immediate attention.`;
  }
  return `All ${pipelineCount} active ingest pipelines are healthy.`;
};
