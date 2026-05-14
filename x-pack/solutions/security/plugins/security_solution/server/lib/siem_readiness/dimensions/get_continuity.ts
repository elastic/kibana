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

  // Build index → all categories map (an index can belong to multiple categories).
  const allCategoriesMap = new Map<string, MainCategories[]>();
  categoriesData?.mainCategoriesMap?.forEach((group) => {
    group.indices.forEach((idx) => {
      const existing = allCategoriesMap.get(idx.indexName) ?? [];
      allCategoriesMap.set(idx.indexName, [...existing, group.category as MainCategories]);
    });
  });

  // Only include pipelines that serve at least one categorized index.
  const categorizedPipelines = pipelines
    .filter((p) => p.indices.some((indexName) => indexToCategoryMap.has(indexName)))
    .map((p) => {
      const categoriesSet = new Set<MainCategories>();
      p.indices.forEach((indexName) => {
        (allCategoriesMap.get(indexName) ?? []).forEach((cat) => categoriesSet.add(cat));
      });
      return { ...p, categories: Array.from(categoriesSet) };
    });

  const status = getContinuityStatus(categorizedPipelines, indexToCategoryMap, ALL_CATEGORIES);

  const actionableFindings: ActionableFinding[] = categorizedPipelines
    .filter((p) => isCriticalFailureRate(p.failedDocsCount, p.docsCount))
    .map((p) => {
      const category = p.categories[0] ?? ('Endpoint' as MainCategories);
      return {
        category,
        severity: 'critical' as const,
        message: `Pipeline ${p.name} has a critical document failure rate (${p.failedDocsCount} of ${p.docsCount} failed)`,
        resource: p.name,
      };
    });

  const summary = buildContinuitySummary(
    status,
    categorizedPipelines.length,
    actionableFindings.length
  );

  return { status, summary, items: categorizedPipelines, actionableFindings };
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
