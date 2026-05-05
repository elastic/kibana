/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../../plugin_contract';
import { securityTool } from '../constants';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { SECURITY_RULE_TYPE_IDS } from './constants';
import { fetchCategories } from '../../../lib/siem_readiness/fetch_categories';
import { compileCoverageData } from '../../../lib/siem_readiness/compile_coverage';
import type { CoverageRuleInput } from '../../../lib/siem_readiness/compile_coverage';

export const SECURITY_SIEM_READINESS_COVERAGE_TOOL_ID = securityTool('siem_readiness_coverage');

const coverageSchema = z.object({
  category: z
    .enum(['Endpoint', 'Identity', 'Network', 'Cloud', 'Application/SaaS'])
    .optional()
    .describe(
      'Filter results to a specific SIEM Readiness category. If omitted, all five categories are returned.'
    ),
});

interface DetectionRuleParams {
  related_integrations?: Array<{ package: string; version?: string; integration?: string }>;
  threat?: Array<{ tactic?: { name?: string } }>;
}

export const siemReadinessCoverageTool = (
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  logger: Logger
): BuiltinToolDefinition<typeof coverageSchema> => {
  return {
    id: SECURITY_SIEM_READINESS_COVERAGE_TOOL_ID,
    type: ToolType.builtin,
    description: `Analyzes SIEM data coverage and detection rule coverage across the five SIEM Readiness categories: Endpoint, Identity, Network, Cloud, and Application/SaaS.

Reports:
- Which categories have active data flowing into Elasticsearch (based on event.category field)
- Which detection rules are enabled, along with their required integrations
- Which integrations are installed vs missing, and the resulting rule coverage gap
- Which rules map to MITRE ATT&CK tactics

Use this tool when asked about detection coverage, missing integrations, data gaps, or MITRE coverage.`,
    schema: coverageSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) =>
        getAgentBuilderResourceAvailability({ core, request, logger }),
    },
    handler: async ({ category }, { esClient, request }) => {
      try {
        const [, startPlugins] = await core.getStartServices();

        // ── Fetch: categories, rules, installed packages (in parallel where possible) ──
        const [categoriesData, rulesResult] = await Promise.all([
          fetchCategories(esClient.asCurrentUser),
          startPlugins.alerting.getRulesClientWithRequest(request).then((client) =>
            client.find({
              options: {
                ruleTypeIds: [...SECURITY_RULE_TYPE_IDS],
                filter: 'alert.attributes.enabled:true',
                perPage: 10000,
                fields: ['params', 'enabled'],
              },
            })
          ),
        ]);

        const installedPackageNames: string[] = [];
        try {
          const packages =
            (await startPlugins.fleet?.packageService
              .asScoped(request)
              .getInstalledPackages({ perPage: 10000, sortOrder: 'asc' })) ?? {};
          const items = (packages as { items?: Array<{ name: string }> }).items ?? [];
          items.forEach(({ name }) => installedPackageNames.push(name));
        } catch (fleetError) {
          logger.warn(`SIEM Readiness coverage: could not fetch Fleet packages: ${fleetError}`);
        }

        // ── Map rules to the minimal shape compile_coverage needs ──────────────
        const rules: CoverageRuleInput[] = rulesResult.data.map((r) => ({
          related_integrations: (r.params as DetectionRuleParams).related_integrations,
          threat: (r.params as DetectionRuleParams).threat,
        }));

        // ── Compile ────────────────────────────────────────────────────────────
        const data = compileCoverageData(categoriesData, rules, installedPackageNames, {
          category,
        });

        logger.debug(
          `SIEM Readiness coverage tool: ${data.summary.activeCategories.length} active categories, ${rulesResult.data.length} enabled rules`
        );

        return { results: [{ type: ToolResultType.other, data }] };
      } catch (error) {
        logger.error(`SIEM Readiness coverage tool failed: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to fetch SIEM Readiness coverage data: ${error.message}` },
            },
          ],
        };
      }
    },
    tags: ['security', 'siem-readiness', 'coverage'],
  };
};
