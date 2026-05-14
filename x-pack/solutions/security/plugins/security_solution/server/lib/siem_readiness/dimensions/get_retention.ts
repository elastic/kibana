/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ActionableFinding, MainCategories, RetentionPayload } from '@kbn/siem-readiness';
import { ALL_CATEGORIES, getRetentionStatus, isRetentionNonCompliant } from '@kbn/siem-readiness';
import { fetchCategories, fetchRetention } from '../fetchers';

export const getRetention = async ({
  esClient,
  isServerless,
  logger,
}: {
  esClient: ElasticsearchClient;
  isServerless: boolean;
  logger: Logger;
}): Promise<RetentionPayload> => {
  const [retentionResponse, categoriesData] = await Promise.all([
    fetchRetention({ esClient, isServerless, logger }),
    fetchCategories({ esClient, logger }),
  ]);

  // Category indices are backing index names (.ds-<stream>-YYYY.MM.DD-N); retention items carry the
  // data stream name. Use the same contains-match the UI used: categoryIdx.includes(itemIndexName).
  const getCategoriesForItem = (itemIndexName: string): MainCategories[] => {
    const cats = new Set<MainCategories>();
    categoriesData?.mainCategoriesMap?.forEach((group) => {
      if (group.indices.some((idx) => idx.indexName.includes(itemIndexName))) {
        cats.add(group.category as MainCategories);
      }
    });
    return Array.from(cats);
  };

  const categorizedItems = retentionResponse.items
    .map((item) => ({ item, categories: getCategoriesForItem(item.indexName) }))
    .filter(({ categories }) => categories.length > 0)
    .map(({ item, categories }) => ({ ...item, categories }));

  const status = getRetentionStatus(categoriesData, retentionResponse, ALL_CATEGORIES);

  const actionableFindings: ActionableFinding[] = categorizedItems
    .filter((item) => isRetentionNonCompliant(item.status))
    .map((item) => {
      const category = item.categories[0] ?? ('Endpoint' as MainCategories);
      const retentionLabel = item.retentionDays ? `${item.retentionDays}d` : 'no retention policy';
      return {
        category,
        severity: 'warning' as const,
        message: `${item.indexName} has retention of ${retentionLabel}, below the 365-day FedRAMP threshold`,
        resource: item.indexName,
      };
    });

  const summary = buildRetentionSummary(status, categorizedItems.length, actionableFindings.length);

  return { status, summary, items: categorizedItems, actionableFindings };
};

const buildRetentionSummary = (
  status: string,
  itemCount: number,
  nonCompliantCount: number
): string => {
  if (status === 'noData') return 'No data streams or indices found to evaluate retention.';
  if (nonCompliantCount > 0) {
    return `${nonCompliantCount} of ${itemCount} indices or data streams have retention below the 365-day FedRAMP threshold.`;
  }
  return `All ${itemCount} indices and data streams meet the 365-day retention requirement.`;
};
