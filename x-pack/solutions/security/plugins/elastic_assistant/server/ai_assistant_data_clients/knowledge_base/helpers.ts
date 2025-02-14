/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { errors } from '@elastic/elasticsearch';
import {
  QueryDslQueryContainer,
  SearchHit,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { AuthenticatedUser } from '@kbn/core-security-common';
import {
  contentReferenceBlock,
  ContentReferencesStore,
  esqlQueryReference,
  IndexEntry,
} from '@kbn/elastic-assistant-common';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isString } from 'lodash';

export const isModelAlreadyExistsError = (error: Error) => {
  return (
    error instanceof errors.ResponseError &&
    (error.body.error.type === 'resource_not_found_exception' ||
      error.body.error.type === 'status_exception')
  );
};

/**
 * Returns an Elasticsearch query DSL that performs a vector search against the Knowledge Base for the given query/user/filter. Searches only for DocumentEntries, not IndexEntries as they have no content.
 *
 * @param filter - Optional filter to apply to the search
 * @param kbResource - Specific resource tag to filter for, e.g. 'esql' or 'user'
 * @param query - The search query provided by the user
 * @param required - Whether to only include required entries
 * @param user - The authenticated user
 * @returns
 */
export const getKBVectorSearchQuery = ({
  filter,
  kbResource,
  query,
  required,
  user,
}: {
  filter?: QueryDslQueryContainer | undefined;
  kbResource?: string | undefined;
  query?: string;
  required?: boolean | undefined;
  user: AuthenticatedUser;
}): QueryDslQueryContainer => {
  const resourceFilter = kbResource
    ? [
        {
          term: {
            kb_resource: kbResource,
          },
        },
      ]
    : [];
  const requiredFilter = required
    ? [
        {
          term: {
            required,
          },
        },
      ]
    : [];

  const userFilter = {
    should: [
      {
        nested: {
          path: 'users',
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match: user.profile_uid
                    ? { 'users.id': user.profile_uid }
                    : { 'users.name': user.username },
                },
              ],
            },
          },
        },
      },
      {
        bool: {
          must_not: [
            {
              nested: {
                path: 'users',
                query: {
                  bool: {
                    filter: {
                      exists: {
                        field: 'users',
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    ],
  };

  let semanticTextFilter:
    | Array<{ semantic: { field: string; query: string } }>
    | Array<{
        text_expansion: { 'vector.tokens': { model_id: string; model_text: string } };
      }> = [];

  if (query) {
    semanticTextFilter = [
      {
        semantic: {
          field: 'semantic_text',
          query,
        },
      },
    ];
  }

  return {
    bool: {
      must: [...semanticTextFilter, ...requiredFilter, ...resourceFilter],
      ...userFilter,
      filter,
      minimum_should_match: 1,
    },
  };
};

/**
 * Returns a StructuredTool for a given IndexEntry
 */
export const getStructuredToolForIndexEntry = ({
  indexEntry,
  esClient,
  contentReferencesStore,
  logger,
}: {
  indexEntry: IndexEntry;
  esClient: ElasticsearchClient;
  contentReferencesStore: ContentReferencesStore | undefined;
  logger: Logger;
}): DynamicStructuredTool => {
  const inputSchema = indexEntry.inputSchema?.reduce((prev, input) => {
    const fieldType =
      input.fieldType === 'string'
        ? z.string()
        : input.fieldType === 'number'
        ? z.number()
        : input.fieldType === 'boolean'
        ? z.boolean()
        : z.any();
    return { ...prev, [input.fieldName]: fieldType.describe(input.description) };
  }, {});

  return new DynamicStructuredTool({
    name: indexEntry.name
      // Replace invalid characters with an empty string
      .replace(/[^a-zA-Z0-9_]/g, '')
      // Ensure it starts with a letter. If not, prepend 'a'
      .replace(/^[^a-zA-Z]/, 'a'),
    description: indexEntry.description,
    schema: z.object({
      query: z.string().describe(indexEntry.queryDescription),
      ...inputSchema,
    }),
    func: async (input, _, cbManager) => {
      logger.debug(
        () => `Generated ${indexEntry.name} Tool:input\n ${JSON.stringify(input, null, 2)}`
      );

      // Generate filters for inputSchema fields
      const filter =
        indexEntry.inputSchema?.reduce(
          // @ts-expect-error Possible to override types with dynamic input schema?
          (prev, i) => [...prev, { term: { [`${i.fieldName}`]: input?.[i.fieldName] } }],
          [] as Array<{ term: { [key: string]: string } }>
        ) ?? [];

      const params: SearchRequest = {
        index: indexEntry.index,
        size: 10,
        query: {
          bool: {
            must: [
              {
                semantic: {
                  field: indexEntry.field,
                  query: input.query,
                },
              },
            ],
            filter,
          },
        },
        highlight: {
          fields: {
            [indexEntry.field]: {
              type: 'semantic',
              number_of_fragments: 2,
            },
          },
        },
      };

      try {
        const result = await esClient.search(params);

        const kbDocs = result.hits.hits.map((hit) => {
          const reference =
            contentReferencesStore && contentReferencesStore.add((p) => createReference(p.id, hit));

          if (indexEntry.outputFields && indexEntry.outputFields.length > 0) {
            return indexEntry.outputFields.reduce(
              (prev, field) => {
                // @ts-expect-error
                return { ...prev, [field]: hit._source[field] };
              },
              reference ? { citation: contentReferenceBlock(reference) } : {}
            );
          }

          return {
            text: hit.highlight?.[indexEntry.field].join('\n --- \n'),
            ...(reference ? { citation: contentReferenceBlock(reference) } : {}),
          };
        });

        logger.debug(() => `Similarity Search Params:\n ${JSON.stringify(params)}`);
        logger.debug(() => `Similarity Search Results:\n ${JSON.stringify(result)}`);
        logger.debug(() => `Similarity Text Extract Results:\n ${JSON.stringify(kbDocs)}`);

        return `###\nBelow are all relevant documents in JSON format:\n${JSON.stringify(
          kbDocs
        )}###`;
      } catch (e) {
        logger.error(`Error performing IndexEntry KB Similarity Search: ${e.message}`);
        return `I'm sorry, but I was unable to find any information in the knowledge base. Perhaps this error would be useful to deliver to the user. Be sure to print it below your response and in a codeblock so it is rendered nicely: ${e.message}`;
      }
    },
    tags: ['knowledge-base'],
    // TODO: Remove after ZodAny is fixed https://github.com/langchain-ai/langchainjs/blob/main/langchain-core/src/tools.ts
  }) as unknown as DynamicStructuredTool;
};

const createReference = (id: string, hit: SearchHit<unknown>) => {
  const hitIndex = hit._index;
  const hitId = hit._id;
  const esqlQuery = `FROM ${hitIndex} ${hitId ? `METADATA _id\n | WHERE _id == "${hitId}"` : ''}`;

  let timerange;
  const source = hit._source as Record<string, unknown>;

  if ('@timestamp' in source && isString(source['@timestamp']) && hitId) {
    timerange = { from: source['@timestamp'], to: source['@timestamp'] };
  }

  return esqlQueryReference({
    id,
    query: esqlQuery,
    label: `Index: ${hit._index}`,
    timerange,
  });
};
