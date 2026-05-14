/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { CategoriesResponse, CategoryGroup } from '@kbn/siem-readiness';

interface CategoryBucket {
  key: string;
  doc_count: number;
}

interface IndexBucket {
  key: string;
  doc_count: number;
  by_category: {
    buckets: CategoryBucket[];
  };
}

interface AggregationResponse {
  by_index: {
    buckets: IndexBucket[];
  };
}

export const MAIN_CATEGORY_MAPPING: Record<string, string[]> = {
  Endpoint: [
    'endpoint',
    'file',
    'process',
    'registry',
    'malware',
    'driver',
    'host',
    'vulnerability',
  ],
  Identity: ['authentication', 'iam', 'session', 'user'],
  Network: ['network', 'firewall', 'intrusion_detection', 'dns'],
  Cloud: ['cloud', 'configuration'],
  'Application/SaaS': ['application', 'web', 'database', 'package', 'api'],
};

export const CATEGORY_TO_MAIN_CATEGORY: Record<string, string> = {};
Object.entries(MAIN_CATEGORY_MAPPING).forEach(([mainCategory, subCategories]) => {
  subCategories.forEach((subCategory) => {
    CATEGORY_TO_MAIN_CATEGORY[subCategory] = mainCategory;
  });
});

export const fetchCategories = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<CategoriesResponse> => {
  const searchResult = await esClient.search({
    index: '*',
    size: 0,
    aggs: {
      by_index: {
        terms: {
          field: '_index',
          size: 1000,
        },
        aggs: {
          by_category: {
            terms: {
              field: 'event.category',
              size: 10,
            },
          },
        },
      },
    },
  });

  const rawCategoryMap: Record<string, Array<{ indexName: string; docs: number }>> = {};

  const aggregations = searchResult.aggregations as AggregationResponse | undefined;
  aggregations?.by_index?.buckets?.forEach((indexBucket) => {
    // Normalize backing data stream indices (.ds-<name>-YYYY.MM.DD-NNNNNN) to the data stream name
    // so downstream consumers can match against data stream names (e.g. from ILM/DSL retention data).
    const rawName = indexBucket.key;
    const dsMatch = rawName.match(/^\.ds-(.+)-\d{4}\.\d{2}\.\d{2}-\d+$/);
    const indexName = dsMatch ? dsMatch[1] : rawName;

    indexBucket.by_category?.buckets?.forEach((categoryBucket) => {
      const category = categoryBucket.key;
      const docCount = categoryBucket.doc_count;

      if (!rawCategoryMap[category]) {
        rawCategoryMap[category] = [];
      }

      // Multiple backing indices for the same data stream collapse into one entry; sum their docs.
      const existing = rawCategoryMap[category].find((e) => e.indexName === indexName);
      if (existing) {
        existing.docs += docCount;
      } else {
        rawCategoryMap[category].push({ indexName, docs: docCount });
      }
    });
  });

  const rawCategoriesMap: CategoryGroup[] = Object.entries(rawCategoryMap).map(
    ([category, indices]) => ({ category, indices })
  );

  const mainCategoryMap: Record<string, Record<string, number>> = {};

  rawCategoriesMap.forEach((categoryGroup) => {
    const subCategory = categoryGroup.category;
    const mainCategory = CATEGORY_TO_MAIN_CATEGORY[subCategory];

    if (!mainCategory) return;

    if (!mainCategoryMap[mainCategory]) {
      mainCategoryMap[mainCategory] = {};
    }

    categoryGroup.indices.forEach((indexInfo) => {
      const currentCount = mainCategoryMap[mainCategory][indexInfo.indexName] || 0;
      mainCategoryMap[mainCategory][indexInfo.indexName] = currentCount + indexInfo.docs;
    });
  });

  const mainCategoriesMap: CategoryGroup[] = Object.entries(mainCategoryMap).map(
    ([category, indexMap]) => ({
      category,
      indices: Object.entries(indexMap).map(([indexName, docs]) => ({ indexName, docs })),
    })
  );

  logger.info(
    `Retrieved ${rawCategoriesMap.length} raw event.category groups and ${mainCategoriesMap.length} main category groups`
  );

  return { rawCategoriesMap, mainCategoriesMap };
};
