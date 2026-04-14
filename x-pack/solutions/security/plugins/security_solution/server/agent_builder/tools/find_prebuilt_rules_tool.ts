/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { securityTool } from './constants';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { createPrebuiltRuleAssetsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { PrebuiltRuleAsset } from '../../lib/detection_engine/prebuilt_rules/model/rule_assets/prebuilt_rule_asset';

const findPrebuiltRulesSchema = z.object({
  search: z
    .string()
    .optional()
    .describe(
      'Search term to match against rule names and descriptions. Case-insensitive partial match.'
    ),
  tags: z
    .array(z.string())
    .optional()
    .describe(
      'Filter by tags. All specified tags must be present on a rule. Examples: "Windows", "Elastic", "Persistence", "Domain: Endpoint"'
    ),
  severity: z
    .enum(['low', 'medium', 'high', 'critical'])
    .optional()
    .describe('Filter by severity level'),
  rule_type: z
    .enum([
      'query',
      'eql',
      'threshold',
      'threat_match',
      'machine_learning',
      'new_terms',
      'saved_query',
      'esql',
    ])
    .optional()
    .describe('Filter by detection rule type'),
  mitre_tactic: z
    .string()
    .optional()
    .describe(
      'Filter by MITRE ATT&CK tactic name. Case-insensitive partial match. Examples: "Initial Access", "Persistence", "Credential Access"'
    ),
  mitre_technique_id: z
    .string()
    .optional()
    .describe(
      'Filter by MITRE ATT&CK technique or subtechnique ID. Examples: "T1059", "T1059.001"'
    ),
  limit: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .describe('Maximum number of rules to return. Defaults to 10.'),
});

export const SECURITY_FIND_PREBUILT_RULES_TOOL_ID = securityTool('find_prebuilt_rules');

const matchesThreatTactic = (rule: PrebuiltRuleAsset, tactic: string): boolean => {
  const tacticLower = tactic.toLowerCase();
  return rule.threat?.some((t) => t.tactic.name.toLowerCase().includes(tacticLower)) ?? false;
};

const matchesThreatTechniqueId = (rule: PrebuiltRuleAsset, techniqueId: string): boolean => {
  const techIdUpper = techniqueId.toUpperCase();
  return (
    rule.threat?.some((t) =>
      t.technique?.some(
        (tech) =>
          tech.id.toUpperCase() === techIdUpper ||
          tech.subtechnique?.some((sub) => sub.id.toUpperCase() === techIdUpper)
      )
    ) ?? false
  );
};

const formatRuleResult = (rule: PrebuiltRuleAsset) => ({
  rule_id: rule.rule_id,
  name: rule.name,
  description: rule.description,
  severity: rule.severity,
  risk_score: rule.risk_score,
  type: rule.type,
  version: rule.version,
  tags: rule.tags,
  threat: rule.threat?.map((t) => ({
    tactic: t.tactic.name,
    techniques: t.technique?.map((tech) => ({
      id: tech.id,
      name: tech.name,
      subtechniques: tech.subtechnique?.map((sub) => ({
        id: sub.id,
        name: sub.name,
      })),
    })),
  })),
  ...('query' in rule && rule.query ? { query: rule.query } : {}),
  ...('language' in rule && rule.language ? { language: rule.language } : {}),
  ...(rule.related_integrations ? { related_integrations: rule.related_integrations } : {}),
});

export const findPrebuiltRulesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof findPrebuiltRulesSchema> => {
  return {
    id: SECURITY_FIND_PREBUILT_RULES_TOOL_ID,
    type: ToolType.builtin,
    description: `Search for Elastic Security prebuilt detection rules by name, tags, severity, rule type, or MITRE ATT&CK tactic/technique. Returns rule details including name, description, severity, risk score, rule type, MITRE ATT&CK mappings, and query information. Use this tool when a user asks about available detection rules, wants to find rules for a specific threat, or needs to understand what prebuilt coverage exists.`,
    schema: findPrebuiltRulesSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (params, { savedObjectsClient }) => {
      const {
        search,
        tags,
        severity,
        rule_type: ruleType,
        mitre_tactic: mitreTactic,
        mitre_technique_id: mitreTechniqueId,
        limit = 10,
      } = params;

      try {
        logger.debug(
          `${SECURITY_FIND_PREBUILT_RULES_TOOL_ID} tool called with params: ${JSON.stringify(
            params
          )}`
        );

        const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
        const allRules = await ruleAssetsClient.fetchLatestAssets();

        let filtered = allRules;

        if (search) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter(
            (rule) =>
              rule.name.toLowerCase().includes(searchLower) ||
              rule.description?.toLowerCase().includes(searchLower)
          );
        }

        if (tags?.length) {
          filtered = filtered.filter((rule) =>
            tags.every((tag) =>
              rule.tags?.some((ruleTag) => ruleTag.toLowerCase() === tag.toLowerCase())
            )
          );
        }

        if (severity) {
          filtered = filtered.filter((rule) => rule.severity === severity);
        }

        if (ruleType) {
          filtered = filtered.filter((rule) => rule.type === ruleType);
        }

        if (mitreTactic) {
          filtered = filtered.filter((rule) => matchesThreatTactic(rule, mitreTactic));
        }

        if (mitreTechniqueId) {
          filtered = filtered.filter((rule) => matchesThreatTechniqueId(rule, mitreTechniqueId));
        }

        const rules = filtered.slice(0, limit).map(formatRuleResult);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total_matching: filtered.length,
                returned: rules.length,
                rules,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${SECURITY_FIND_PREBUILT_RULES_TOOL_ID} tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error searching prebuilt rules: ${errorMessage}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'detection', 'prebuilt-rules', 'search'],
  };
};
