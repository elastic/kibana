/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { get } from 'lodash';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { errors } from '@elastic/elasticsearch';
import { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { AuthenticatedUser } from '@kbn/core-security-common';
import { IndexEntry } from '@kbn/elastic-assistant-common';
import { ElasticsearchClient, Logger } from '@kbn/core/server';

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
  logger,
  elserId,
}: {
  indexEntry: IndexEntry;
  esClient: ElasticsearchClient;
  logger: Logger;
  elserId: string;
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
    name: indexEntry.name.replace(/[^a-zA-Z0-9-]/g, ''), // // Tool names expects a string that matches the pattern '^[a-zA-Z0-9-]+$'
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
        retriever: {
          standard: {
            query: {
              nested: {
                path: `${indexEntry.field}.inference.chunks`,
                query: {
                  sparse_vector: {
                    inference_id: elserId,
                    field: `${indexEntry.field}.inference.chunks.embeddings`,
                    query: input.query,
                  },
                },
                inner_hits: {
                  size: 2,
                  name: `${indexEntry.name}.${indexEntry.field}`,
                  _source: [`${indexEntry.field}.inference.chunks.text`],
                },
              },
            },
            filter,
          },
        },
      };

      try {
        const result = await esClient.search(params);

        const kbDocs = result.hits.hits.map((hit) => {
          if (indexEntry.outputFields && indexEntry.outputFields.length > 0) {
            return indexEntry.outputFields.reduce((prev, field) => {
              // @ts-expect-error
              return { ...prev, [field]: hit._source[field] };
            }, {});
          }

          // We want to send relevant inner hits (chunks) to the LLM as a context
          const innerHitPath = `${indexEntry.name}.${indexEntry.field}`;
          if (hit.inner_hits?.[innerHitPath]) {
            return {
              text: hit.inner_hits[innerHitPath].hits.hits
                .map((innerHit) => innerHit._source.text)
                .join('\n --- \n'),
            };
          }

          return {
            text: get(hit._source, `${indexEntry.field}.inference.chunks[0].text`),
          };
        });

        logger.debug(() => `Similarity Search Params:\n ${JSON.stringify(params)}`);
        logger.debug(() => `Similarity Search Results:\n ${JSON.stringify(result)}`);
        logger.debug(() => `Similarity Text Extract Results:\n ${JSON.stringify(kbDocs)}`);

        return `###\nBelow are all relevant documents in JSON format:\n${JSON.stringify(
          kbDocs
        )}\n###`;
      } catch (e) {
        logger.error(`Error performing IndexEntry KB Similarity Search: ${e.message}`);
        return `I'm sorry, but I was unable to find any information in the knowledge base. Perhaps this error would be useful to deliver to the user. Be sure to print it below your response and in a codeblock so it is rendered nicely: ${e.message}`;
      }
    },
    tags: ['knowledge-base'],
    // TODO: Remove after ZodAny is fixed https://github.com/langchain-ai/langchainjs/blob/main/langchain-core/src/tools.ts
  }) as unknown as DynamicStructuredTool;
};
