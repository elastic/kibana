/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { SecuritySolutionPluginStartDependencies } from '../../plugin_contract';
import { DETECTION_RULE_SML_TYPE } from './detection_rule_sml_type';

export const FIND_RULES_SEMANTIC_TOOL_ID = 'security.find_rules_semantic';

const MAX_QUERY_LENGTH = 1000;
const DEFAULT_SIZE = 10;
const MAX_SIZE = 25;

/** Truncations match `security.find_rules`, so both tools read the same in a transcript. */
const MAX_DESCRIPTION_CHARS = 500;
const MAX_RULE_QUERY_CHARS = 600;

export const findRulesSemanticSchema = z
  .object({
    query: z
      .string()
      .min(1)
      .max(MAX_QUERY_LENGTH)
      .describe(
        'Describe the behavior in plain words, as a sentence, not as keywords. ' +
          'Example: "an attacker exfiltrating data out of the network over DNS". ' +
          'Matching is by meaning, so a rule that describes the same behavior in ' +
          'different words still comes back.'
      ),
    size: z
      .number()
      .int()
      .min(1)
      .max(MAX_SIZE)
      .default(DEFAULT_SIZE)
      .describe('Number of candidate rules to return (default 10).'),
  })
  .strict();

interface FindRulesSemanticToolDeps {
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  logger: Logger;
}

/** SML origin URIs are self-describing: `${type}://${originId}`. */
const originIdOf = (uri: string): string | undefined => uri.split('://')[1] || undefined;

const truncate = (value: unknown, max: number) =>
  typeof value === 'string' && value.length > max ? `${value.slice(0, max)}…` : value;

const UNAVAILABLE_MESSAGE =
  'Semantic rule search is not available in this deployment. Use `security.find_rules` ' +
  'with the single most distinctive word instead, and say that the search matched exact ' +
  'words only, so a rule describing this behavior in other words could have been missed.';

/**
 * Semantic counterpart to `security.find_rules`.
 *
 * `security.find_rules` is lexical: rule `params` live in a `flattened` field, so a rule
 * description matches only on words it literally contains. This tool queries the SML
 * index, where each detection rule is embedded as `semantic_text`, so a rule that
 * describes the same behavior in other words still comes back.
 *
 * SML search returns only identity and text, never a rule's structured fields, so the
 * ranked ids are hydrated from the rules client here. That also keeps `enabled` honest:
 * the index can lag by a crawl interval, the hydrated rule cannot.
 */
export const createFindRulesSemanticTool = ({
  getStartServices,
  logger,
}: FindRulesSemanticToolDeps): BuiltinSkillBoundedTool<typeof findRulesSemanticSchema> => ({
  id: FIND_RULES_SEMANTIC_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Find installed detection rules by MEANING rather than by exact words. ' +
    'Use it when you need to know whether some behavior is already detected and you ' +
    'only have a description of that behavior. Pass a sentence, not keywords. ' +
    'Returns ranked candidates that you must still judge; it never claims a rule matches. ' +
    'Complements `security.find_rules`, which matches exact words and is the only option ' +
    'for structured filters (enabled, severity, tags, MITRE id) and for counts. Read-only.',
  schema: findRulesSemanticSchema,
  handler: async (input, { request, esClient, spaceId }) => {
    try {
      const [, startPlugins] = await getStartServices();
      const sml = startPlugins.agentBuilderSml;

      if (!sml) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { message: UNAVAILABLE_MESSAGE, available: false, total: 0, rules: [] },
            },
          ],
        };
      }

      const { results } = await sml.search({
        query: input.query,
        size: input.size,
        spaceId,
        esClient,
        request,
        filters: { types: [DETECTION_RULE_SML_TYPE] },
      });

      // Ranking is carried by array order: SML search exposes no score, and a score would
      // be a ranking signal anyway, never a match verdict.
      const rankedIds = results
        .map((result) => originIdOf(result.origin?.uri ?? ''))
        .filter((id): id is string => Boolean(id));

      if (rankedIds.length === 0) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  'No detection rule resembled that behavior. Semantic search found nothing, ' +
                  'so an exact-word check is unlikely to add anything.',
                available: true,
                total: 0,
                rules: [],
              },
            },
          ],
        };
      }

      const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
      const hydrated = await Promise.all(
        rankedIds.map(async (id) => {
          try {
            const rule = await rulesClient.get({ id });
            const params = (rule.params ?? {}) as Record<string, unknown>;
            return {
              id: rule.id,
              ruleId: params.ruleId ?? params.rule_id,
              name: rule.name,
              description: truncate(params.description, MAX_DESCRIPTION_CHARS),
              query: truncate(params.query, MAX_RULE_QUERY_CHARS),
              index: params.index,
              dataViewId: params.data_view_id,
              tags: rule.tags,
              enabled: rule.enabled,
              severity: params.severity,
              type: params.type,
            };
          } catch {
            // Indexed but no longer readable: deleted since the last crawl, or outside
            // this user's privileges. Dropping it is the correct answer either way.
            return undefined;
          }
        })
      );
      const rules = hydrated.filter(Boolean);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message:
                rules.length === 0
                  ? 'Semantic search matched rules that are no longer readable. Treat this as no result.'
                  : `Found ${rules.length} candidate rule(s) by meaning, most similar first: ${rules
                      .map((rule) => rule?.name)
                      .join(
                        ', '
                      )}. Judge each against the request; order is similarity, not a verdict.`,
              available: true,
              total: rules.length,
              rules,
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`find_rules_semantic tool failed: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Semantic rule search failed: ${message}` },
          },
        ],
      };
    }
  },
});
