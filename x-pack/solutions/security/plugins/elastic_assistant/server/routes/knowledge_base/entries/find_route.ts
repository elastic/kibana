/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { find } from 'lodash';

import {
  API_VERSIONS,
  DocumentEntry,
  DocumentEntryType,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_FIND,
  FindKnowledgeBaseEntriesRequestQuery,
  FindKnowledgeBaseEntriesResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { estypes } from '@elastic/elasticsearch';
import { ElasticAssistantPluginRouter } from '../../../types';
import { buildResponse } from '../../utils';

import { performChecks } from '../../helpers';
import { transformESSearchToKnowledgeBaseEntry } from '../../../ai_assistant_data_clients/knowledge_base/transforms';
import { EsKnowledgeBaseEntrySchema } from '../../../ai_assistant_data_clients/knowledge_base/types';
import { getKBUserFilter } from './utils';
import { SECURITY_LABS_RESOURCE } from '../constants';

export const findKnowledgeBaseEntriesRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .get({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_FIND,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindKnowledgeBaseEntriesRequestQuery),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<FindKnowledgeBaseEntriesResponse>> => {
        const assistantResponse = buildResponse(response);
        try {
          const { query } = request;
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);

          // Perform license, authenticated user and FF checks
          const checkResponse = performChecks({
            context: ctx,
            request,
            response,
          });
          if (!checkResponse.isSuccess) {
            return checkResponse.response;
          }

          const kbDataClient = await ctx.elasticAssistant.getAIAssistantKnowledgeBaseDataClient();
          const currentUser = checkResponse.currentUser;
          const userFilter = getKBUserFilter(currentUser);
          const systemFilter = ` AND (kb_resource:"user" OR type:"index")`;
          const additionalFilter = query.filter ? ` AND ${query.filter}` : '';

          const result = await kbDataClient?.findDocuments<EsKnowledgeBaseEntrySchema>({
            perPage: query.per_page,
            page: query.page,
            sortField: query.sort_field,
            sortOrder: query.sort_order,
            filter: `${userFilter}${systemFilter}${additionalFilter}`,
            fields: query.fields,
            aggs: {
              global_aggs: {
                global: {},
                aggs: {
                  kb_resource_aggregation: {
                    terms: {
                      field: 'kb_resource',
                      size: 10,
                      exclude: ['user'],
                    },
                    aggs: {
                      top_documents: {
                        top_hits: {
                          size: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          const systemEntries = [
            {
              bucketId: 'securityLabsId',
              kbResource: SECURITY_LABS_RESOURCE,
              name: 'Security Labs',
              required: true,
            },
          ]
            .map(({ bucketId, kbResource, name, required }) => {
              const bucket = find(
                (
                  (result?.data.aggregations?.global_aggs as estypes.AggregationsGlobalAggregate)
                    ?.kb_resource_aggregation as {
                    buckets: estypes.AggregationsBuckets;
                  }
                )?.buckets,
                ['key', kbResource]
              ) as {
                doc_count: number;
                top_documents: estypes.AggregationsTopHitsAggregate;
              };

              const entry = bucket?.top_documents?.hits?.hits?.[0]?._source;
              const entryCount = bucket?.doc_count;
              const entries: DocumentEntry[] =
                entry == null
                  ? []
                  : [
                      {
                        id: bucketId,
                        createdAt: entry.created_at,
                        createdBy: entry.created_by,
                        updatedAt: entry.updated_at,
                        updatedBy: entry.updated_by,
                        users: [],
                        name,
                        namespace: entry.namespace,
                        type: DocumentEntryType.value,
                        kbResource,
                        source: '',
                        required,
                        text: `${entryCount}`,
                      },
                    ];
              return entries;
            })
            .flat();

          if (result) {
            return response.ok({
              body: {
                perPage: result.perPage,
                page: result.page,
                total: result.total + systemEntries.length,
                data: [...transformESSearchToKnowledgeBaseEntry(result.data), ...systemEntries],
              },
            });
          }
          return response.ok({
            body: { perPage: query.per_page, page: query.page, data: [], total: 0 },
          });
        } catch (err) {
          const error = transformError(err);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
