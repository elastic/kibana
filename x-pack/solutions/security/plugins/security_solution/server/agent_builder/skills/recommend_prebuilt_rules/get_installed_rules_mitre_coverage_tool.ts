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
import { RULE_PARAMS_FIELDS } from '../../../../common/detection_engine/rule_management/rule_fields';
import { findRules } from '../../../lib/detection_engine/rule_management/logic/search/find_rules';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

export const GET_INSTALLED_RULES_MITRE_COVERAGE_INLINE_TOOL_ID =
  'security.get_installed_rules_mitre_coverage';

export const getInstalledRulesMitreCoverageSchema = z.object({}).strict();

const TACTIC_AGG_SIZE = 20;
const TECHNIQUE_AGG_SIZE = 500;
const SUBTECHNIQUE_AGG_SIZE = 50;

interface NameBucket {
  buckets: Array<{ key: string }>;
}

interface SubtechniqueBucket {
  key: string;
  doc_count: number;
  name: NameBucket;
}

interface TechniqueBucket {
  key: string;
  doc_count: number;
  name: NameBucket;
  subtechniques: { buckets: SubtechniqueBucket[] };
}

interface TacticBucket {
  key: string;
  doc_count: number;
  name: NameBucket;
}

interface MitreCoverageAggResult {
  by_tactic?: { buckets?: TacticBucket[] };
  by_technique?: { buckets?: TechniqueBucket[] };
  with_mitre_mapping?: { doc_count: number };
}

interface GetInstalledRulesMitreCoverageToolDeps {
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  logger: Logger;
}

export const createGetInstalledRulesMitreCoverageTool = ({
  getStartServices,
  logger,
}: GetInstalledRulesMitreCoverageToolDeps): BuiltinSkillBoundedTool<
  typeof getInstalledRulesMitreCoverageSchema
> => ({
  id: GET_INSTALLED_RULES_MITRE_COVERAGE_INLINE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Returns MITRE ATT&CK coverage across the user\'s currently-installed detection rules. ' +
    'Includes total rule count, count with MITRE mappings, and per-tactic and per-technique ' +
    'rule counts with nested subtechnique counts. ' +
    'Only returns tactics and techniques with count > 0 — absence means zero coverage. ' +
    'The canonical 14-tactic list is in the skill prompt; use it to identify missing tactics. ' +
    'Session-cached — do not call again in the same conversation.',
  schema: getInstalledRulesMitreCoverageSchema,
  handler: async (_input, { request }) => {
    try {
      const [, startPlugins] = await getStartServices();
      const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

      const findResult = await findRules({
        rulesClient,
        filter: undefined,
        perPage: 0,
        page: 1,
        sortField: undefined,
        sortOrder: undefined,
        fields: undefined,
        aggregations: {
          by_tactic: {
            terms: { field: RULE_PARAMS_FIELDS.TACTIC_ID, size: TACTIC_AGG_SIZE },
            aggs: {
              name: { terms: { field: RULE_PARAMS_FIELDS.TACTIC_NAME, size: 1 } },
            },
          },
          by_technique: {
            terms: { field: RULE_PARAMS_FIELDS.TECHNIQUE_ID, size: TECHNIQUE_AGG_SIZE },
            aggs: {
              name: { terms: { field: RULE_PARAMS_FIELDS.TECHNIQUE_NAME, size: 1 } },
              subtechniques: {
                terms: { field: RULE_PARAMS_FIELDS.SUBTECHNIQUE_ID, size: SUBTECHNIQUE_AGG_SIZE },
                aggs: {
                  name: { terms: { field: RULE_PARAMS_FIELDS.SUBTECHNIQUE_NAME, size: 1 } },
                },
              },
            },
          },
          with_mitre_mapping: {
            filter: { exists: { field: RULE_PARAMS_FIELDS.TACTIC_ID } },
          },
        },
      });

      const aggs = findResult.aggregations as MitreCoverageAggResult | undefined;

      const tacticBuckets = aggs?.by_tactic?.buckets ?? [];
      const techniqueBuckets = aggs?.by_technique?.buckets ?? [];
      const withMitreCount = aggs?.with_mitre_mapping?.doc_count ?? 0;

      const tactics = tacticBuckets.map((b) => ({
        id: b.key,
        name: b.name.buckets[0]?.key ?? b.key,
        count: b.doc_count,
      }));

      const techniques = techniqueBuckets.map((b) => {
        const subtechniqueBuckets = b.subtechniques?.buckets ?? [];
        const subtechniques = subtechniqueBuckets.map((s) => ({
          id: s.key,
          name: s.name.buckets[0]?.key ?? s.key,
          count: s.doc_count,
        }));

        return {
          id: b.key,
          name: b.name.buckets[0]?.key ?? b.key,
          count: b.doc_count,
          ...(subtechniques.length > 0 ? { subtechniques } : {}),
        };
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              total_installed_rules: findResult.total,
              total_with_mitre_mapping: withMitreCount,
              tactics,
              techniques,
            },
          },
        ],
      };
    } catch (error) {
      logger.error(
        `get_installed_rules_mitre_coverage tool failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to fetch installed rules MITRE coverage: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          },
        ],
      };
    }
  },
});
