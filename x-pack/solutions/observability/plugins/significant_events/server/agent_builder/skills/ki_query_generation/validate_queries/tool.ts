/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { Logger } from '@kbn/core/server';
import { MAX_ID_LENGTH, MAX_TEXT_LENGTH, MAX_TITLE_LENGTH } from '@kbn/significant-events-schema';
import {
  createQueryValidationContext,
  QUERY_GENERATION_EXCLUDED_FEATURE_TYPES,
  validateKIQueries,
  type ValidatedKIQuery,
} from '@kbn/nightshift-ai';
import { z } from '@kbn/zod/v4';
import type { GetScopedClients } from '../../../../routes/types';
import { getRequestAbortSignal } from '../../../../routes/utils/get_request_abort_signal';
import { streamToAnalysisTarget } from '../../../../lib/significant_events/stream_to_analysis_target';

export const SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID =
  'platform.sig_events.ki_queries_validate';

export type AcceptedQuery = Omit<ValidatedKIQuery, 'esql'> & {
  esql: { query: string };
};

const MAX_QUERIES_PER_CALL = 100;
const MAX_FEATURE_IDS_PER_QUERY = 100;
const TOOL_EXECUTION_TIMEOUT_MS = 240_000;

const candidateQuerySchema = z.object({
  type: z
    .enum(['match', 'stats'])
    .optional()
    .describe(
      'Hint for query type. "match" for WHERE-only filters, "stats" for aggregation queries. The system derives the authoritative type from ES|QL content.'
    ),
  esql: z.string().max(MAX_TEXT_LENGTH).describe('The ES|QL detection query.'),
  title: z.string().max(MAX_TITLE_LENGTH).describe('Short human-readable name for the query.'),
  description: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .describe(
      'A semantically searchable description explaining what the query detects and why it matters. Should be 1-2 sentences that help users find this query when searching by concept or intent.'
    ),
  category: z
    .enum(['operational', 'configuration', 'resource_health', 'error', 'security'])
    .describe('Significant event category the query belongs to.'),
  severity_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'Severity from 0 (low) to 100 (critical): 80-100 critical, 60-79 high, 40-59 medium, 0-39 low.'
    ),
  evidence: z
    .array(z.string().max(MAX_TEXT_LENGTH))
    .max(100)
    .optional()
    .describe(
      'Optional free-text supporting evidence, such as observed log snippets or the feature values the query is grounded in.'
    ),
  replaces: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      'If this query replaces an existing one (same detection intent but updated ES|QL), set this to the ID of the existing query it supersedes.'
    ),
  expects_matches: z
    .boolean()
    .optional()
    .describe(
      'Optional evaluation metadata. true: the query is grounded in current evidence and should match rows in the evaluation window. false: the query deliberately watches for a plausible future condition not present in the current evidence.'
    ),
  feature_ids: z
    .array(z.string().max(MAX_ID_LENGTH))
    .min(1)
    .max(MAX_FEATURE_IDS_PER_QUERY)
    .describe(
      'IDs of the features that informed this query. Each ID must match a feature `id` returned by a previous platform_sig_events_ki_features_get call; unknown IDs are stripped and queries with zero valid IDs are rejected.'
    ),
});

const validateQueriesSchema = z.object({
  target_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('Target identifier against which the candidate ES|QL queries must be validated.'),
  queries: z
    .array(candidateQuerySchema)
    .max(MAX_QUERIES_PER_CALL)
    .describe(
      'Complete candidate query batch. Resubmit the full repaired batch after validation errors, or pass an empty array to finalize with no queries.'
    ),
});

export const createValidateQueriesTool = ({
  getScopedClients,
  logger,
}: {
  getScopedClients: GetScopedClients;
  logger: Logger;
}): BuiltinSkillBoundedTool<typeof validateQueriesSchema> => {
  return {
    id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Validate and finalize a complete KI query batch. Rewrites sources, verifies feature links, rejects duplicates and over-broad predicates, and executes ES|QL with LIMIT 0. A batch is finalized only when every query passes.',
    schema: validateQueriesSchema,
    handler: async ({ target_id: targetId, queries }, context) => {
      if (queries.length === 0) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                target_id: targetId,
                queries: [],
                finalized: true,
                finalized_queries: [],
              },
            },
          ],
        };
      }

      try {
        const scopedClients = await getScopedClients({ request: context.request });
        const stream = await scopedClients.streamsClient.getStream(targetId);
        const target = streamToAnalysisTarget(stream);
        const kiClient = await scopedClients.getKnowledgeIndicatorClient();
        const featureIds = [...new Set(queries.flatMap(({ feature_ids: ids }) => ids))];
        const [{ hits: features }, { [target.id]: existingLinks }] = await Promise.all([
          kiClient.getFeatures(target.id, {
            featureIds,
            excludedType: [...QUERY_GENERATION_EXCLUDED_FEATURE_TYPES],
          }),
          kiClient.getStreamToQueryLinksMap([target.id]),
        ]);
        const existingQueries = existingLinks.map(({ query }) => ({
          id: query.id,
          title: query.title,
          type: query.type,
          severity_score: query.severity_score,
          description: query.description,
          esql: query.esql.query,
        }));
        const signal = AbortSignal.any([
          getRequestAbortSignal(context.request),
          AbortSignal.timeout(TOOL_EXECUTION_TIMEOUT_MS),
        ]);
        const validationContext = await createQueryValidationContext({
          sources: target.sources,
          esClient: scopedClients.streamDataEsClient,
          existingQueries,
          signal,
          logger,
        });
        const { results, acceptedQueries } = await validateKIQueries({
          queries,
          features,
          context: validationContext,
          esClient: scopedClients.streamDataEsClient,
          signal,
          logger,
          queryValidationTimeoutMs: scopedClients.tuningConfig.query_validation_timeout_ms,
          collectQueryAttempts: true,
        });

        const validatedQueries: AcceptedQuery[] = acceptedQueries.map(({ esql, ...query }) => ({
          ...query,
          esql: { query: esql },
        }));
        const finalized = results.every(({ valid }) => valid === true);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                target_id: target.id,
                queries: results,
                finalized,
                ...(finalized ? { finalized_queries: validatedQueries } : {}),
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`KI query validation failed: ${message}`);
        return {
          results: [{ type: ToolResultType.error, data: { message } }],
        };
      }
    },
  };
};
