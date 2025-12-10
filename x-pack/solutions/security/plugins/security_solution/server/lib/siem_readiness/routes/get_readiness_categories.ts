/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { GET_SIEM_READINESS_CATEGORIES_API_PATH } from '../../../../common/api/siem_readiness/constants';
import { API_VERSIONS } from '../../../../common/constants';
import type { SiemReadinessRoutesDeps } from '../types';

interface IndexInfo {
  indexName: string;
  docs: number;
}

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

export interface CategoryGroup {
  category: string;
  indices: IndexInfo[];
}

export interface CategoriesResponse {
  rawCategoriesMap: CategoryGroup[];
  mainCategoriesMap: CategoryGroup[];
}

// Mapping of main categories to their sub-categories
// Main categories: Endpoint, Identity, Network, Cloud, Application/SaaS
const MAIN_CATEGORY_MAPPING: Record<string, string[]> = {
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

// Create reverse mapping for quick lookup: sub-category -> main category
const CATEGORY_TO_MAIN_CATEGORY: Record<string, string> = {};
Object.entries(MAIN_CATEGORY_MAPPING).forEach(([mainCategory, subCategories]) => {
  subCategories.forEach((subCategory) => {
    CATEGORY_TO_MAIN_CATEGORY[subCategory] = mainCategory;
  });
});

export const getReadinessCategoriesRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger']
) => {
  router.versioned
    .get({
      path: GET_SIEM_READINESS_CATEGORIES_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
      },

      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

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

          // Format the ES aggregation response into raw category groups
          const rawCategoryMap: Record<string, IndexInfo[]> = {};

          const aggregations = searchResult.aggregations as AggregationResponse | undefined;
          aggregations?.by_index?.buckets?.forEach((indexBucket: IndexBucket) => {
            const indexName = indexBucket.key;

            indexBucket.by_category?.buckets?.forEach((categoryBucket: CategoryBucket) => {
              const category = categoryBucket.key;
              const docCount = categoryBucket.doc_count;

              if (!rawCategoryMap[category]) {
                rawCategoryMap[category] = [];
              }

              rawCategoryMap[category].push({
                indexName,
                docs: docCount,
              });
            });
          });

          // Convert raw map to array of CategoryGroup objects
          const rawCategoriesMap: CategoryGroup[] = Object.entries(rawCategoryMap).map(
            ([category, indices]) => ({
              category,
              indices,
            })
          );

          // Create main categories map by grouping rawCategoriesMap into 5 main categories
          // We need to aggregate document counts for indices that appear in multiple sub-categories
          const mainCategoryMap: Record<string, Record<string, number>> = {};

          rawCategoriesMap.forEach((categoryGroup) => {
            const subCategory = categoryGroup.category;
            const mainCategory = CATEGORY_TO_MAIN_CATEGORY[subCategory];

            if (!mainCategory) {
              // Skip unmapped categories
              return;
            }

            if (!mainCategoryMap[mainCategory]) {
              mainCategoryMap[mainCategory] = {};
            }

            // For each index in this sub-category, add its document count to the main category
            categoryGroup.indices.forEach((indexInfo) => {
              const currentCount = mainCategoryMap[mainCategory][indexInfo.indexName] || 0;
              mainCategoryMap[mainCategory][indexInfo.indexName] = currentCount + indexInfo.docs;
            });
          });

          // Convert main map to array of CategoryGroup objects with aggregated counts
          const mainCategoriesMap: CategoryGroup[] = Object.entries(mainCategoryMap).map(
            ([category, indexMap]) => ({
              category,
              indices: Object.entries(indexMap).map(([indexName, docs]) => ({
                indexName,
                docs,
              })),
            })
          );

          const responseBody: CategoriesResponse = {
            rawCategoriesMap,
            mainCategoriesMap,
          };

          logger.info(
            `Retrieved ${rawCategoriesMap.length} raw event.category groups and ${mainCategoriesMap.length} main category groups`
          );

          return response.ok({
            body: responseBody,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error retrieving SIEM readiness categories: ${error.message}`);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
