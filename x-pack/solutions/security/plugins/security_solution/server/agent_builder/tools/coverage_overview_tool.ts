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
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { ExperimentalFeatures } from '../../../common';

export const SECURITY_COVERAGE_OVERVIEW_TOOL_ID = securityTool('coverage_overview');

const coverageOverviewSchema = z.object({
  search_term: z
    .string()
    .optional()
    .describe('Filter by rule name, index pattern, or MITRE tactic/technique name'),
  activity: z
    .array(z.enum(['enabled', 'disabled']))
    .optional()
    .describe('Filter by rule activity status. Omit to include all.'),
  source: z
    .array(z.enum(['prebuilt', 'custom']))
    .optional()
    .describe('Filter by rule source. Omit to include all.'),
});

export const coverageOverviewTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof coverageOverviewSchema> => {
  return {
    id: SECURITY_COVERAGE_OVERVIEW_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Analyze MITRE ATT&CK coverage of installed detection rules. Shows which tactics and techniques are covered, identifies gaps, and reports unmapped rules. Use to assess detection posture.',
    schema: coverageOverviewSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        if (!experimentalFeatures?.aiRuleCreationEnabled) {
          return {
            status: 'unavailable',
            reason:
              'AI rule creation is not enabled. Enable it via experimental feature flag "aiRuleCreationEnabled".',
          };
        }
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ search_term: searchTerm, activity, source }, { request }) => {
      logger.debug(
        `${SECURITY_COVERAGE_OVERVIEW_TOOL_ID} tool called with search_term: ${
          searchTerm ?? 'none'
        }`
      );

      try {
        const [, startPlugins] = await core.getStartServices();
        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

        const allRulesData = [];
        let currentPage = 1;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const batch = await rulesClient.find({
            options: { perPage: pageSize, page: currentPage },
          });
          allRulesData.push(...batch.data);
          hasMore = allRulesData.length < batch.total;
          currentPage++;
        }

        const coverage: Record<string, string[]> = {};
        const unmappedRuleIds: string[] = [];
        const rulesData: Record<string, { name: string; activity: string }> = {};

        const filteredRules = allRulesData.filter((rule) => {
          const params = rule.params as Record<string, unknown>;
          if (activity?.length && !activity.includes(rule.enabled ? 'enabled' : 'disabled')) {
            return false;
          }
          if (source?.length) {
            const isPrebuilt = (params?.immutable ?? false) as boolean;
            const wantsPrebuilt = source.includes('prebuilt');
            const wantsCustom = source.includes('custom');
            if (wantsPrebuilt && !wantsCustom && !isPrebuilt) return false;
            if (wantsCustom && !wantsPrebuilt && isPrebuilt) return false;
            if (!wantsPrebuilt && !wantsCustom) return false;
          }
          if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const nameMatch = rule.name.toLowerCase().includes(searchLower);
            const indexMatch = ((params?.index ?? []) as string[]).some((i) =>
              i.toLowerCase().includes(searchLower)
            );
            if (!nameMatch && !indexMatch) return false;
          }
          return true;
        });

        for (const rule of filteredRules) {
          const params = rule.params as Record<string, unknown>;
          const threat = params?.threat as
            | Array<{
                tactic?: { id?: string };
                technique?: Array<{
                  id?: string;
                  subtechnique?: Array<{ id?: string }>;
                }>;
              }>
            | undefined;

          rulesData[rule.id] = {
            name: rule.name,
            activity: rule.enabled ? 'enabled' : 'disabled',
          };

          let mapped = false;
          if (threat?.length) {
            for (const t of threat) {
              if (t.tactic?.id) {
                coverage[t.tactic.id] = coverage[t.tactic.id] ?? [];
                coverage[t.tactic.id].push(rule.id);
                mapped = true;
              }
              for (const tech of t.technique ?? []) {
                if (tech.id) {
                  coverage[tech.id] = coverage[tech.id] ?? [];
                  coverage[tech.id].push(rule.id);
                  mapped = true;
                }
                for (const sub of tech.subtechnique ?? []) {
                  if (sub.id) {
                    coverage[sub.id] = coverage[sub.id] ?? [];
                    coverage[sub.id].push(rule.id);
                    mapped = true;
                  }
                }
              }
            }
          }
          if (!mapped) {
            unmappedRuleIds.push(rule.id);
          }
        }

        const coveredTechniques = Object.keys(coverage);
        const totalRules = Object.keys(rulesData).length;
        const enabledRules = Object.values(rulesData).filter(
          (r) => r.activity === 'enabled'
        ).length;

        const coverageSummary = coveredTechniques.map((techniqueId) => ({
          technique_id: techniqueId,
          rule_count: coverage[techniqueId].length,
          rule_names: coverage[techniqueId]
            .slice(0, 5)
            .map((ruleId) => rulesData[ruleId]?.name ?? ruleId),
        }));

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total_rules: totalRules,
                enabled_rules: enabledRules,
                disabled_rules: totalRules - enabledRules,
                covered_techniques: coveredTechniques.length,
                unmapped_rules: unmappedRuleIds.length,
                coverage: coverageSummary,
                unmapped_rule_names: unmappedRuleIds
                  .slice(0, 10)
                  .map((id) => rulesData[id]?.name ?? id),
                message: `Coverage analysis complete: ${coveredTechniques.length} MITRE techniques covered by ${totalRules} rules (${enabledRules} enabled). ${unmappedRuleIds.length} rules are not mapped to any MITRE technique.`,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${SECURITY_COVERAGE_OVERVIEW_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error fetching coverage overview: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'detection', 'coverage', 'mitre'],
  };
};
