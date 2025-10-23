/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition, ModelProvider } from '@kbn/onechat-server';
import type { CoreSetup, IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import { encode } from 'gpt-tokenizer';
import { orderBy } from 'lodash';
import { MessageRole } from '@kbn/inference-common';
import { getSpaceIdFromPath } from '@kbn/spaces-plugin/common';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';

export const OBSERVABILITY_RECALL_KNOWLEDGE_BASE_TOOL_ID = 'observability.recall_knowledge_base';

// Knowledge base constants based on observability AI assistant
const OBSERVABILITY_KB_INDEX_ALIAS = '.kibana-observability-ai-assistant-kb';

enum KnowledgeBaseType {
  UserInstruction = 'user_instruction',
  Contextual = 'contextual',
}

interface KnowledgeBaseEntry {
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

interface RecalledEntry {
  id: string;
  title: string;
  text: string;
  esScore: number;
}

const recallKnowledgeBaseSchema = z.object({
  query: z.string().min(1).describe('The search query to find relevant knowledge base entries.'),
});

export async function createObservabilityRecallKnowledgeBaseTool({
  core,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof recallKnowledgeBaseSchema> = {
    id: OBSERVABILITY_RECALL_KNOWLEDGE_BASE_TOOL_ID,
    type: ToolType.builtin,
    description: `Search the observability knowledge base for documentation, guides, custom organizational knowledge, and user-specific information. This contains specialized content not accessible through other search tools, including personal user details, preferences, and context from previous interactions. Use when built-in tools don't have the needed information or when queries involve custom organizational policies, procedures, domain-specific knowledge, or personal user information not available in standard indices.`,
    schema: recallKnowledgeBaseSchema,
    tags: ['observability', 'knowledge', 'documentation', 'context'],
    handler: async ({ query }, { esClient, modelProvider, request }) => {
      try {
        const rewrittenQuery = await rewriteQuery({ query, modelProvider, logger });

        logger.debug(
          `Recalling from knowledge base: original="${query}", rewritten="${rewrittenQuery}"`
        );

        const namespace = await getNamespaceForRequest(request, core);
        logger.debug(`Using namespace: ${namespace}`);
        const entries = await recallFromKnowledgeBase({
          esClient,
          query: rewrittenQuery,
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
                query: rewrittenQuery,
                entries: filteredEntries,
                total: entries.length,
                dropped: entries.length - filteredEntries.length,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error recalling from knowledge base: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to recall from knowledge base: ${error.message}`,
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
 * Rewrite the user query using LLM to improve semantic search
 */
async function rewriteQuery({
  query,
  modelProvider,
  logger,
}: {
  query: string;
  modelProvider: ModelProvider;
  logger: Logger;
}): Promise<string> {
  try {
    const systemMessage = `You are a retrieval query-rewriting assistant. Your ONLY task is to transform the user's query into a single question that will be embedded and searched against "semantic_text" fields in Elasticsearch.

OUTPUT
Return exactly one English question (≤ 50 tokens) and nothing else—no preamble, no code-blocks, no JSON.

RULES & STRATEGY
 - Always produce one question; never ask the user anything in return.
 - Preserve literal identifiers: if the query references an entity - e.g. service name, hostname, trace ID—repeat that exact string, unchanged; no paraphrasing, truncation, or symbol removal.
 - Expand vague references using context clues, but never invent facts, names, or numbers.
 - If context is too thin for a precise query, output a single broad question centered on any topic words mentioned (e.g. "latency", "errors", "logs").
 - Use neutral third-person phrasing; avoid "I", "we", or "you".
 - Keep it one declarative sentence not exceeding 50 tokens with normal punctuation—no lists, meta-commentary, or extra formatting.

EXAMPLES
• "How to debug high latency in APM?" ➜ "What are best practices for debugging high latency issues in APM traces?"
• "SLO configuration" ➜ "How do you configure Service Level Objectives in observability?"
• "Error rate spike investigation" ➜ "What steps should be taken to investigate sudden error rate spikes?"
• "logs not showing up" ➜ "Why might logs not appear in the observability solution?"`;

    const { inferenceClient } = await modelProvider.getDefaultModel();

    const response = await inferenceClient.chatComplete({
      system: systemMessage,
      messages: [{ role: MessageRole.User, content: query }],
    });

    const rewrittenQuery = response.content;
    logger.debug(`Query rewritten from "${query}" to "${rewrittenQuery}"`);

    return rewrittenQuery || query;
  } catch (error) {
    logger.error(`Failed to rewrite query: ${error.message}`);
    logger.debug(error);
    return query; // Fall back to original query
  }
}

/**
 * Recall entries from the knowledge base using semantic search
 */
async function recallFromKnowledgeBase({
  esClient,
  query,
  namespace,
  logger,
}: {
  esClient: IScopedClusterClient;
  query: string;
  namespace: string;
  logger: Logger;
}): Promise<RecalledEntry[]> {
  try {
    const response = await esClient.asInternalUser.search<KnowledgeBaseEntry>({
      index: [OBSERVABILITY_KB_INDEX_ALIAS],
      query: {
        bool: {
          should: [{ semantic: { field: 'semantic_text', query } }],
          filter: [
            { term: { namespace } }, // filter by space
            { term: { public: true } }, // only public entries
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
function filterEntriesByTokenLimit(entries: RecalledEntry[], logger: Logger): RecalledEntry[] {
  const sortedEntries = orderBy(entries, 'esScore', 'desc');

  let tokenCount = 0;
  const returnedEntries: RecalledEntry[] = [];

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
