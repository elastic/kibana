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
import { createPrebuiltRuleAssetsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { SecuritySolutionPluginStartDependencies } from '../../plugin_contract';
import { PREBUILT_RULE_SML_TYPE } from './prebuilt_rule_sml_type';

export const FIND_PREBUILT_RULES_SEMANTIC_TOOL_ID = 'security.find_prebuilt_rules_semantic';

const MAX_QUERY_LENGTH = 1000;
const DEFAULT_SIZE = 10;
const MAX_SIZE = 25;
const MAX_DESCRIPTION_CHARS = 500;

export const findPrebuiltRulesSemanticSchema = z
  .object({
    query: z
      .string()
      .min(1)
      .max(MAX_QUERY_LENGTH)
      .describe(
        'Describe the behavior in plain words, as a sentence, not as keywords. ' +
          'Example: "brute force attempts against user accounts in an identity provider". ' +
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

interface FindPrebuiltRulesSemanticToolDeps {
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  logger: Logger;
}

/** SML origin URIs are self-describing: `${type}://${originId}`, and here originId is `rule_id`. */
const ruleIdOf = (uri: string): string | undefined => uri.split('://')[1] || undefined;

const truncate = (value: string | undefined, max: number) =>
  value && value.length > max ? `${value.slice(0, max)}…` : value;

const UNAVAILABLE_MESSAGE =
  'Semantic search over the prebuilt catalog is not available in this deployment. Use ' +
  '`security.find_prebuilt_rules` with the single most distinctive word instead, and say ' +
  'that the search matched exact words only.';

/**
 * Semantic counterpart to `security.find_prebuilt_rules`.
 *
 * The keyword tool matches words a catalog rule literally uses. This one queries the SML
 * index, where each prebuilt rule is embedded as `semantic_text`, so a rule that describes
 * the same behavior in other words still comes back.
 *
 * SML search returns identity and text only, so the ranked `rule_id`s are hydrated from the
 * rule-asset client, which is also what supplies `version` — the field an install action
 * needs and the index deliberately does not carry.
 */
export const createFindPrebuiltRulesSemanticTool = ({
  getStartServices,
  logger,
}: FindPrebuiltRulesSemanticToolDeps): BuiltinSkillBoundedTool<
  typeof findPrebuiltRulesSemanticSchema
> => ({
  id: FIND_PREBUILT_RULES_SEMANTIC_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Find INSTALLABLE Elastic prebuilt rules by MEANING rather than by exact words. ' +
    'Use it when you need to know whether Elastic already ships a rule for some behavior ' +
    'and you only have a description of that behavior. Pass a sentence, not keywords. ' +
    'Returns ranked candidates with the `version` an install needs; you must still judge ' +
    'each one. Complements `security.find_prebuilt_rules`, which matches exact words and ' +
    'is the only option for structured filters and counts. Read-only.',
  schema: findPrebuiltRulesSemanticSchema,
  handler: async (input, { request, esClient, spaceId, savedObjectsClient }) => {
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
        filters: { types: [PREBUILT_RULE_SML_TYPE] },
      });

      // Ranking is carried by array order: SML search exposes no score, and a score would
      // be a ranking signal anyway, never a match verdict.
      const rankedRuleIds = results
        .map((result) => ruleIdOf(result.origin?.uri ?? ''))
        .filter((id): id is string => Boolean(id));

      if (rankedRuleIds.length === 0) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  'No prebuilt rule resembled that behavior. Semantic search found nothing, ' +
                  'so an exact-word check is unlikely to add anything.',
                available: true,
                total: 0,
                rules: [],
              },
            },
          ],
        };
      }

      // One catalog read for the whole candidate set, then filtered to the ranked ids, so
      // the response order stays the similarity order.
      const assets = await createPrebuiltRuleAssetsClient(savedObjectsClient).fetchLatestAssets();
      const byRuleId = new Map(assets.map((asset) => [asset.rule_id, asset]));

      const rules = rankedRuleIds
        .map((ruleId) => byRuleId.get(ruleId))
        .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
        .map((asset) => ({
          ruleId: asset.rule_id,
          name: asset.name,
          // `version` is what the install action needs; the index does not carry it.
          version: asset.version,
          description: truncate(asset.description, MAX_DESCRIPTION_CHARS),
          severity: asset.severity,
          tags: asset.tags,
          relatedIntegrations: asset.related_integrations,
        }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message:
                rules.length === 0
                  ? 'Semantic search matched catalog entries that are no longer present. Treat this as no result.'
                  : `Found ${rules.length} candidate prebuilt rule(s) by meaning, most similar first: ${rules
                      .map((rule) => rule.name)
                      .join(', ')}. Judge each against the request; order is similarity, not a verdict.`,
              available: true,
              total: rules.length,
              rules,
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`find_prebuilt_rules_semantic tool failed: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Semantic prebuilt-rule search failed: ${message}` },
          },
        ],
      };
    }
  },
});
