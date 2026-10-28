/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  searchIntegrationKnowledgeInputSchema,
  searchIntegrationKnowledgeStepCommonDefinition,
} from '../../../../../common/workflows/step_types/endpoint/integration_knowledge/search_integration_knowledge_step_common';
import { isIndexNotFound, isNotFound, isUnauthorized } from '../common/read_error';
import { toApiExecutionError } from '../../../utils/to_api_execution_error';

const INTEGRATION_KNOWLEDGE_INDEX = '.integration_knowledge';

const MAX_FRAGMENTS_PER_DOC = 5;

const MAX_CONTENT_LENGTH = 4000;

interface IntegrationKnowledgeDoc {
  package_name: string;
  filename: string;
  content: string;
  version?: string;
}

const cutContent = (content: string): string =>
  content.length > MAX_CONTENT_LENGTH
    ? `${content.substring(0, MAX_CONTENT_LENGTH)}\n\n[Content truncated...]`
    : content;

const buildExcerpt = (highlights: string[] | undefined, content: string): string => {
  if (highlights && highlights.length > 0) {
    return cutContent(highlights.join('\n\n---\n\n'));
  }
  return cutContent(content);
};

export interface SearchIntegrationKnowledgeDependencies {
  getInternalEsClient: () => Promise<ElasticsearchClient> | ElasticsearchClient;
}

export const createSearchIntegrationKnowledgeStepDefinition = ({
  getInternalEsClient,
}: SearchIntegrationKnowledgeDependencies) =>
  createServerStepDefinition({
    ...searchIntegrationKnowledgeStepCommonDefinition,
    handler: async (context) => {
      const {
        query,
        package_name: packageName,
        max,
      } = searchIntegrationKnowledgeInputSchema.parse(context.input);
      const esClient = await getInternalEsClient();
      try {
        const response = await esClient.search<IntegrationKnowledgeDoc>({
          index: INTEGRATION_KNOWLEDGE_INDEX,
          size: max,
          query: {
            bool: {
              must: [
                {
                  semantic: {
                    field: 'content',
                    query,
                  },
                },
              ],
              filter: [
                {
                  term: {
                    package_name: packageName,
                  },
                },
              ],
            },
          },
          highlight: {
            fields: {
              content: {
                order: 'score',
                number_of_fragments: MAX_FRAGMENTS_PER_DOC,
              },
            },
          },
          _source: ['package_name', 'filename', 'content', 'version'],
        });

        const results = response.hits.hits.map((hit) => {
          const source = hit._source as IntegrationKnowledgeDoc;
          return {
            filename: source.filename,
            version: source.version ?? '',
            excerpt: buildExcerpt(hit.highlight?.content, source.content),
          };
        });

        return { output: { available: true, results } };
      } catch (error) {
        if (isNotFound(error) || isIndexNotFound(error) || isUnauthorized(error)) {
          context.logger.warn(
            `Integration knowledge unavailable (index: ${INTEGRATION_KNOWLEDGE_INDEX})`
          );
          return { output: { available: false, results: [] } };
        }
        throw toApiExecutionError(error, 'search integration knowledge');
      }
    },
  });
