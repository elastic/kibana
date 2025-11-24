/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/onechat-server';
import type {
  AuthenticatedUser,
  CoreSetup,
  IScopedClusterClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import { encode } from 'gpt-tokenizer';
import { orderBy } from 'lodash';
import { getSpaceIdFromPath } from '@kbn/spaces-plugin/common';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';
import { getAccessQuery } from './get_access_query';

export const OBSERVABILITY_SEARCH_KNOWLEDGE_BASE_TOOL_ID = 'observability.search_knowledge_base';

// Knowledge base constants based on observability AI assistant
const OBSERVABILITY_KB_INDEX_ALIAS = '.kibana-observability-ai-assistant-kb';

enum KnowledgeBaseType {
  UserInstruction = 'user_instruction',
  Contextual = 'contextual',
}

export interface KnowledgeBaseEntry {
  '@timestamp': string;
  id: string;
  title?: string;
  text: string;
  type?: KnowledgeBaseType;
  public: boolean;
  user?: {
    name: string;
  };
  confidence?: 'low' | 'medium' | 'high'; // deprecated
  is_correction?: boolean; // deprecated
}

interface KnowledgeBaseResult {
  id: string;
  title: string;
  text: string;
  esScore: number;
}

const searchKnowledgeBaseSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'One focused semantic search question that restates the latest user request together with essential conversation context, preserving exact identifiers and key entities.'
    ),
});

export function createSearchKnowledgeBaseTool({
  core,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  logger: Logger;
}): StaticToolRegistration<typeof searchKnowledgeBaseSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof searchKnowledgeBaseSchema> = {
    id: OBSERVABILITY_SEARCH_KNOWLEDGE_BASE_TOOL_ID,
    type: ToolType.builtin,
    description: `Search the observability knowledge base for custom organizational knowledge, and user-specific information. This contains specialized content not accessible through other search tools, including personal user details, preferences, and context from previous interactions. Use when built-in tools don't have the needed information or when queries involve custom organizational policies, procedures, domain-specific knowledge, or personal user information not available in standard indices.`,
    schema: searchKnowledgeBaseSchema,
    tags: ['observability', 'knowledge', 'documentation', 'context'],
    handler: async ({ query }, { esClient, request }) => {
      const [, plugins] = await core.getStartServices();
      const user = plugins.security.authc.getCurrentUser(request);

      try {
        const normalizedQuery = query.trim();
        logger.debug(`Searching knowledge base with query: "${normalizedQuery}"`);

        const namespace = await getNamespaceForRequest(request, core);
        logger.debug(`Using namespace: ${namespace}`);
        const entries = await searchKnowledgeBase({
          user,
          esClient,
          query: normalizedQuery,
          namespace,
          logger,
        });

        if (entries.length === 0) {
          logger.debug('No knowledge base entries found');
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: 'No knowledge base entries found for the given query.',
                  entries: [],
                },
              },
            ],
          };
        }

        logger.debug(`Found ${entries.length} knowledge base entries`);

        const filteredEntries = filterEntriesByTokenLimit(entries, logger);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                query: normalizedQuery,
                entries: filteredEntries,
                total: entries.length,
                noOfDroppedEntries: entries.length - filteredEntries.length,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error searching from knowledge base: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to searching from knowledge base: ${error.message}`,
                stack: error.stack,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}

/**
 * Query the knowledge base using semantic search
 */
async function searchKnowledgeBase({
  user,
  esClient,
  query,
  namespace,
  logger,
}: {
  user: AuthenticatedUser | null;
  esClient: IScopedClusterClient;
  query: string;
  namespace: string;
  logger: Logger;
}): Promise<KnowledgeBaseResult[]> {
  try {
    const response = await esClient.asInternalUser.search<KnowledgeBaseEntry>({
      index: [OBSERVABILITY_KB_INDEX_ALIAS],
      query: {
        bool: {
          should: [{ semantic: { field: 'semantic_text', query } }],
          filter: [
            ...getAccessQuery({ user, namespace }),
            { bool: { must_not: { term: { type: KnowledgeBaseType.UserInstruction } } } }, // exclude user instructions
          ],
        },
      },
      size: 10,
      _source: {
        includes: ['text', 'labels', 'doc_id', 'title'],
      },
    });

    return response.hits.hits.map((hit) => ({
      text: hit._source?.text ?? '',
      title: hit._source?.title ?? '',
      esScore: hit._score ?? 0,
      id: hit._id ?? '',
    }));
  } catch (error) {
    // return empty array if index doesn't exist
    if (error.meta?.statusCode === 404) {
      logger.debug('Knowledge base index does not exist');
      return [];
    }
    throw error;
  }
}

/**
 * Filter entries by token limit to avoid exceeding context window
 */
const MAX_TOKENS = 4000;
function filterEntriesByTokenLimit(
  entries: KnowledgeBaseResult[],
  logger: Logger
): KnowledgeBaseResult[] {
  const sortedEntries = orderBy(entries, 'esScore', 'desc');

  let tokenCount = 0;
  const returnedEntries: KnowledgeBaseResult[] = [];

  for (const entry of sortedEntries) {
    const entryTokens = encode(entry.text).length;

    const isAboveTokenLimit = tokenCount + entryTokens > MAX_TOKENS;
    if (isAboveTokenLimit) {
      break;
    }

    returnedEntries.push(entry);
    tokenCount += entryTokens;
  }

  const droppedCount = sortedEntries.length - returnedEntries.length;
  if (droppedCount > 0) {
    logger.debug(`Dropped ${droppedCount} entries due to token limit (${MAX_TOKENS} tokens)`);
  }

  return returnedEntries;
}

// Get the current namespace from the request
async function getNamespaceForRequest(request: KibanaRequest, core: CoreSetup) {
  const [coreStart] = await core.getStartServices();
  const { serverBasePath } = coreStart.http.basePath;

  const basePath = coreStart.http.basePath.get(request);
  const { spaceId } = getSpaceIdFromPath(basePath, serverBasePath);
  return spaceId;
}
