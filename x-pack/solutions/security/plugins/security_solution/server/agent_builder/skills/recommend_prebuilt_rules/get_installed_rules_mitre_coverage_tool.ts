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
import { findRules } from '../../../lib/detection_engine/rule_management/logic/search/find_rules';
import type { RuleParams } from '../../../lib/detection_engine/rule_schema';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

export const GET_INSTALLED_RULES_MITRE_COVERAGE_INLINE_TOOL_ID =
  'security.get_installed_rules_mitre_coverage';

export const getInstalledRulesMitreCoverageSchema = z.object({}).strict();

const MITRE_ATTACK_FRAMEWORK = 'MITRE ATT&CK';

// `rulesClient.find` is capped by `index.max_result_window` (10k by default), so we read up to
// that many installed rules. Same limitation the coverage-overview endpoint documents — see
// https://github.com/elastic/kibana/issues/160698. `total_installed_rules` still reflects the
// true total; only the per-id tallies are computed over the fetched page.
const MAX_INSTALLED_RULES = 10000;

interface MitreCoverageEntry {
  id: string;
  name: string;
  count: number;
}

interface MitreTechniqueCoverage extends MitreCoverageEntry {
  subtechniques?: MitreCoverageEntry[];
}

export interface MitreCoverageData {
  total_installed_rules: number;
  total_with_mitre_mapping: number;
  tactics: MitreCoverageEntry[];
  techniques: MitreTechniqueCoverage[];
}

type RuleWithThreat = Pick<RuleParams, 'threat'>;

const byCountDescThenId = (a: MitreCoverageEntry, b: MitreCoverageEntry): number =>
  b.count - a.count || a.id.localeCompare(b.id);

/**
 * Tallies MITRE ATT&CK coverage from the structured `params.threat` of installed rules.
 *
 * We read the structured threat object from each rule (which preserves the association between
 * an id, its name, and its parent technique) rather than aggregating the underlying
 * `flattened` `params` field — `flattened` collapses the threat object into an uncorrelated bag
 * of keywords, so an aggregation cannot pair an id with its own name or nest a subtechnique
 * under the correct technique.
 *
 * Each rule contributes at most 1 to any tactic/technique/subtechnique count (ids are
 * de-duplicated within a rule). Names come straight from the rule data.
 */
export const buildMitreCoverageFromRules = (
  rules: Array<{ params: RuleWithThreat }>,
  totalInstalledRules: number
): MitreCoverageData => {
  const tacticCounts = new Map<string, number>();
  const tacticNames = new Map<string, string>();
  const techniqueCounts = new Map<string, number>();
  const techniqueNames = new Map<string, string>();
  const subtechniqueCounts = new Map<string, number>();
  const subtechniqueNames = new Map<string, string>();
  const subtechniqueParents = new Map<string, string>(); // subtechnique id -> parent technique id
  let totalWithMitreMapping = 0;

  for (const rule of rules) {
    const threat = rule.params.threat ?? [];

    // De-duplicate within a single rule so each rule counts once per id.
    const ruleTactics = new Set<string>();
    const ruleTechniques = new Set<string>();
    const ruleSubtechniques = new Set<string>();

    const mitreThreats = threat.filter(
      (threatItem) => threatItem.framework === MITRE_ATTACK_FRAMEWORK
    );
    for (const threatItem of mitreThreats) {
      const tacticId = threatItem.tactic?.id;
      if (tacticId) {
        ruleTactics.add(tacticId);
        if (threatItem.tactic?.name) {
          tacticNames.set(tacticId, threatItem.tactic.name);
        }
      }

      for (const technique of threatItem.technique ?? []) {
        if (technique.id) {
          ruleTechniques.add(technique.id);
          if (technique.name) {
            techniqueNames.set(technique.id, technique.name);
          }
        }

        for (const subtechnique of technique.subtechnique ?? []) {
          if (subtechnique.id) {
            ruleSubtechniques.add(subtechnique.id);
            if (subtechnique.name) {
              subtechniqueNames.set(subtechnique.id, subtechnique.name);
            }
            if (technique.id) {
              subtechniqueParents.set(subtechnique.id, technique.id);
            }
          }
        }
      }
    }

    if (ruleTactics.size > 0) {
      totalWithMitreMapping += 1;
    }
    for (const id of ruleTactics) {
      tacticCounts.set(id, (tacticCounts.get(id) ?? 0) + 1);
    }
    for (const id of ruleTechniques) {
      techniqueCounts.set(id, (techniqueCounts.get(id) ?? 0) + 1);
    }
    for (const id of ruleSubtechniques) {
      subtechniqueCounts.set(id, (subtechniqueCounts.get(id) ?? 0) + 1);
    }
  }

  // Group subtechniques under their parent technique. Use the parent recorded during iteration,
  // falling back to the id prefix (e.g. T1059.001 -> T1059) for defensiveness.
  const subtechniquesByParent = new Map<string, MitreCoverageEntry[]>();
  for (const [id, count] of subtechniqueCounts) {
    const parentId = subtechniqueParents.get(id) ?? id.split('.')[0];
    const entries = subtechniquesByParent.get(parentId) ?? [];
    entries.push({ id, name: subtechniqueNames.get(id) ?? id, count });
    subtechniquesByParent.set(parentId, entries);
  }

  const tactics = Array.from(tacticCounts.entries())
    .map(([id, count]) => ({ id, name: tacticNames.get(id) ?? id, count }))
    .sort(byCountDescThenId);

  // Every technique that has coverage, plus any parent referenced only by a subtechnique (a
  // malformed-data guard — normally the parent technique id is always recorded alongside it).
  const techniqueIds = new Set<string>([
    ...techniqueCounts.keys(),
    ...subtechniquesByParent.keys(),
  ]);
  const techniques = Array.from(techniqueIds)
    .map((id) => {
      const subtechniques = (subtechniquesByParent.get(id) ?? []).sort(byCountDescThenId);
      const count =
        techniqueCounts.get(id) ?? Math.max(0, ...subtechniques.map((entry) => entry.count));
      return {
        id,
        name: techniqueNames.get(id) ?? id,
        count,
        ...(subtechniques.length > 0 ? { subtechniques } : {}),
      };
    })
    .sort(byCountDescThenId);

  return {
    total_installed_rules: totalInstalledRules,
    total_with_mitre_mapping: totalWithMitreMapping,
    tactics,
    techniques,
  };
};

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
    "Returns MITRE ATT&CK coverage across the user's currently-installed detection rules. " +
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

      // Read the structured `params.threat` per rule and tally in memory. We deliberately do
      // NOT aggregate the underlying `flattened` `params` field — see buildMitreCoverageFromRules.
      const { data, total } = await findRules({
        rulesClient,
        filter: undefined,
        fields: ['params.threat'],
        page: 1,
        perPage: MAX_INSTALLED_RULES,
        sortField: undefined,
        sortOrder: undefined,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: buildMitreCoverageFromRules(data, total),
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
