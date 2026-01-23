/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { IRouter, Logger } from '@kbn/core/server';
import {
  MULTI_TERMS_AGGREGATE_ROUTE,
  AGGREGATE_PAGE_SIZE,
  ORCHESTRATOR_CLUSTER_ID,
  ORCHESTRATOR_RESOURCE_ID,
  ORCHESTRATOR_NAMESPACE,
  ORCHESTRATOR_CLUSTER_NAME,
  CONTAINER_IMAGE_NAME,
  CLOUD_INSTANCE_NAME,
  ENTRY_LEADER_ENTITY_ID,
  ENTRY_LEADER_USER_ID,
  ENTRY_LEADER_INTERACTIVE,
} from '../../common/constants';
import type {
  MultiTermsAggregateGroupBy,
  MultiTermsAggregateBucketPaginationResult,
} from '../../common/types';

export const registerMultiTermsAggregateRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: MULTI_TERMS_AGGREGATE_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            requiredPrivileges: ['securitySolution'],
          },
        },
        validate: {
          request: {
            query: schema.object({
              index: schema.string(),
              query: schema.string(),
              countBy: schema.maybe(
                schema.oneOf([
                  schema.literal(ORCHESTRATOR_CLUSTER_ID),
                  schema.literal(ORCHESTRATOR_RESOURCE_ID),
                  schema.literal(ORCHESTRATOR_NAMESPACE),
                  schema.literal(ORCHESTRATOR_CLUSTER_NAME),
                  schema.literal(CLOUD_INSTANCE_NAME),
                  schema.literal(CONTAINER_IMAGE_NAME),
                  schema.literal(ENTRY_LEADER_ENTITY_ID),
                ])
              ),
              // maxSize is set to 8 to match the number of valid groupBy fields
              groupBys: schema.arrayOf(
                schema.object({
                  field: schema.oneOf([
                    schema.literal(ORCHESTRATOR_CLUSTER_ID),
                    schema.literal(ORCHESTRATOR_RESOURCE_ID),
                    schema.literal(ORCHESTRATOR_NAMESPACE),
                    schema.literal(ORCHESTRATOR_CLUSTER_NAME),
                    schema.literal(CLOUD_INSTANCE_NAME),
                    schema.literal(CONTAINER_IMAGE_NAME),
                    schema.literal(ENTRY_LEADER_USER_ID),
                    schema.literal(ENTRY_LEADER_INTERACTIVE),
                  ]),
                  missing: schema.maybe(schema.string()),
                }),
                { defaultValue: [], maxSize: 8 }
              ),
              page: schema.number({ max: 10000, min: 0 }),
              perPage: schema.maybe(schema.number({ max: 100, min: 1 })),
            }),
          },
        },
      },
      async (context, request, response) => {
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        const { query, countBy, groupBys, page, perPage, index } = request.query;

        try {
          const body = await doSearch(client, index, query, groupBys, page, perPage, countBy);

          return response.ok({ body });
        } catch (err) {
          const error = transformError(err);
          logger.error(`Failed to fetch k8s multi_terms_aggregate: ${err}`);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};

export const doSearch = async (
  client: ElasticsearchClient,
  index: string,
  query: string,
  groupBys: MultiTermsAggregateGroupBy[],
  page: number, // zero based
  perPage = AGGREGATE_PAGE_SIZE,
  countBy?: string
): Promise<MultiTermsAggregateBucketPaginationResult> => {
  const queryDSL = JSON.parse(query);

  const countByAggs = countBy
    ? {
        count_by_aggs: {
          cardinality: {
            field: countBy,
          },
        },
        count_alerts: {
          cardinality: {
            field: countBy,
          },
        },
      }
    : undefined;

  const search = await client.search({
    index: [index],
    query: queryDSL,
    size: 0,
    aggs: {
      custom_agg: {
        multi_terms: {
          terms: groupBys,
        },
        aggs: {
          ...countByAggs,
          bucket_sort: {
            bucket_sort: {
              size: perPage + 1, // check if there's a "next page"
              from: perPage * page,
            },
          },
        },
      },
    },
  });

  const agg: any = search.aggregations?.custom_agg;
  const buckets = agg?.buckets || [];

  const hasNextPage = buckets.length > perPage;

  if (hasNextPage) {
    buckets.pop();
  }

  return {
    buckets,
    hasNextPage,
  };
};
