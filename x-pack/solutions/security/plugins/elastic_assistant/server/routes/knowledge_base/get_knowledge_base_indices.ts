/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_INDICES_URL,
  GetKnowledgeBaseIndicesResponse,
} from '@kbn/elastic-assistant-common';
import { IKibanaResponse } from '@kbn/core/server';
import { forEach, reduce } from 'lodash';
import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantPluginRouter } from '../../types';

/**
 * Get the indices that have fields of `semantic_text` type
 *
 * @param router IRouter for registering routes
 */
export const getKnowledgeBaseIndicesRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_INDICES_URL,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: false,
      },
      async (context, _, response): Promise<IKibanaResponse<GetKnowledgeBaseIndicesResponse>> => {
        const resp = buildResponse(response);
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const logger = ctx.elasticAssistant.logger;
        const esClient = ctx.core.elasticsearch.client.asCurrentUser;

        try {
          const res = await esClient.fieldCaps({
            index: '*',
            fields: '*',
            types: ['sparse_vector'],
            include_unmapped: true,
            filter_path: 'fields.*.sparse_vector.indices',
          });

          const indicesWithSemanticTextField = reduce(
            res.fields,
            (acc, value, key) => {
              if (key.endsWith('.inference.chunks.embeddings')) {
                forEach(value?.sparse_vector?.indices ?? [], (index) => acc.add(index));
              }
              return acc;
            },
            new Set<string>()
          );

          const mappings = await esClient.indices.getMapping({
            index: Array.from(indicesWithSemanticTextField),
            filter_path: '*.mappings.properties',
          });

          const findSemanticTextPaths = (
            obj: IndicesGetMappingIndexMappingRecord,
            currentPath: string[] = []
          ): string[][] => {
            let paths: string[][] = [];

            for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                // @ts-expect-error
                const value = obj[key];
                const newPath = currentPath.concat(key);

                if (value && typeof value === 'object') {
                  if (value.type === 'semantic_text') {
                    paths.push(
                      newPath.filter(
                        (pathPart) => pathPart !== 'properties' && pathPart !== 'mappings'
                      )
                    );
                  } else {
                    paths = paths.concat(findSemanticTextPaths(value, newPath));
                  }
                }
              }
            }

            return paths;
          };

          const result: GetKnowledgeBaseIndicesResponse = {};

          for (const index in mappings) {
            if (Object.prototype.hasOwnProperty.call(mappings, index)) {
              const paths = findSemanticTextPaths(mappings[index]);
              if (paths.length) {
                result[index] = paths.map((path) => path.join('.'));
              }
            }
          }

          return response.ok({ body: result });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
