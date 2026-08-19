/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tacticOrder } from '../../../../../common/detection_engine/mitre/mitre_tactics_order';
import type {
  CoverageOverviewResponse,
  CoverageOverviewRuleAttributes,
} from '../../../../../common/api/detection_engine';
import { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';

import type {
  CoverageOverviewDashboard,
  CoverageOverviewRuleWithInvalidMitre,
} from '../../model/coverage_overview/dashboard';
import type { CoverageOverviewRule } from '../../model/coverage_overview/rule';
import type {
  MitreTactic,
  MitreTechnique,
  MitreSubTechnique,
} from '../../../../../common/detection_engine/mitre/types';
import { buildCoverageOverviewMitreGraph } from './build_coverage_overview_mitre_graph';

interface MitreData {
  tactics: MitreTactic[];
  techniques: MitreTechnique[];
  subtechniques: MitreSubTechnique[];
}

const lazyMitreConfiguration = () => {
  /**
   * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
   * See https://webpack.js.org/api/module-methods/#magic-comments
   */
  return import(
    /* webpackChunkName: "lazy_mitre_configuration" */
    '../../../../../common/detection_engine/mitre/mitre_tactics_techniques'
  );
};

/**
 * Builds the coverage overview dashboard model from an API response.
 *
 * @param apiResponse - The raw coverage overview API response.
 * @param mitreData - Optional pre-loaded MITRE data (from useMitreConfiguration). When
 *   omitted the function falls back to the statically generated lazy-loaded blob. The
 *   caller is responsible for pre-sorting tactics in display order; when using the
 *   managed source, the hook adapter sorts by position; when using the legacy blob,
 *   tactics are pre-sorted by tacticOrder here before being passed to the graph builder.
 */
export async function buildCoverageOverviewDashboardModel(
  apiResponse: CoverageOverviewResponse,
  mitreData?: MitreData
): Promise<CoverageOverviewDashboard> {
  let tactics: MitreTactic[];
  let techniques: MitreTechnique[];
  let subtechniques: MitreSubTechnique[];

  if (mitreData) {
    // Managed source: caller (useMitreConfiguration) already sorted tactics by position.
    ({ tactics, techniques, subtechniques } = mitreData);
  } else {
    // Legacy path: sort tactics by tacticOrder before building the graph.
    const mitreConfig = await lazyMitreConfiguration();
    tactics = [...mitreConfig.tactics].sort(
      (a, b) => tacticOrder.indexOf(a.id) - tacticOrder.indexOf(b.id)
    );
    techniques = mitreConfig.techniques;
    subtechniques = mitreConfig.subtechniques;
  }

  const mitreTactics = buildCoverageOverviewMitreGraph(tactics, techniques, subtechniques);

  for (const tactic of mitreTactics) {
    for (const ruleId of apiResponse.coverage[tactic.id] ?? []) {
      addRule(tactic, ruleId, apiResponse.rules_data[ruleId]);
    }

    for (const technique of tactic.techniques) {
      for (const ruleId of apiResponse.coverage[technique.id] ?? []) {
        if (apiResponse.coverage[tactic.id]?.includes(ruleId)) {
          addRule(technique, ruleId, apiResponse.rules_data[ruleId]);
        }
      }

      for (const subtechnique of technique.subtechniques) {
        for (const ruleId of apiResponse.coverage[subtechnique.id] ?? []) {
          if (apiResponse.coverage[tactic.id]?.includes(ruleId)) {
            addRule(subtechnique, ruleId, apiResponse.rules_data[ruleId]);
          }
        }
      }
    }
  }

  return {
    mitreTactics,
    unmappedRules: buildUnmappedRules(apiResponse),
    invalidlyMappedRules: buildInvalidlyMappedRules(apiResponse),
    metrics: calcMetrics(apiResponse.rules_data),
  };
}

function calcMetrics(
  rulesData: Record<string, CoverageOverviewRuleAttributes>
): CoverageOverviewDashboard['metrics'] {
  const ruleIds = Object.keys(rulesData);
  const metrics: CoverageOverviewDashboard['metrics'] = {
    totalRulesCount: ruleIds.length,
    totalEnabledRulesCount: 0,
  };

  for (const ruleId of Object.keys(rulesData)) {
    if (rulesData[ruleId].activity === CoverageOverviewRuleActivity.Enabled) {
      metrics.totalEnabledRulesCount++;
    }
  }

  return metrics;
}

function buildUnmappedRules(
  apiResponse: CoverageOverviewResponse
): CoverageOverviewDashboard['unmappedRules'] {
  const unmappedRules: CoverageOverviewDashboard['unmappedRules'] = {
    enabledRules: [],
    disabledRules: [],
    availableRules: [],
  };

  for (const ruleId of apiResponse.unmapped_rule_ids) {
    addRule(unmappedRules, ruleId, apiResponse.rules_data[ruleId]);
  }

  return unmappedRules;
}

function buildInvalidlyMappedRules(
  apiResponse: CoverageOverviewResponse
): CoverageOverviewDashboard['invalidlyMappedRules'] {
  const invalidlyMappedRules: CoverageOverviewDashboard['invalidlyMappedRules'] = {
    enabledRules: [],
    disabledRules: [],
  };

  for (const [ruleId, invalidMitreIds] of Object.entries(apiResponse.invalid_mitre_ids)) {
    addRuleWithInvalidMitreIds(
      invalidlyMappedRules,
      ruleId,
      apiResponse.rules_data[ruleId],
      invalidMitreIds
    );
  }

  return invalidlyMappedRules;
}

function addRuleWithInvalidMitreIds(
  container: {
    enabledRules: CoverageOverviewRuleWithInvalidMitre[];
    disabledRules: CoverageOverviewRuleWithInvalidMitre[];
  },
  ruleId: string,
  ruleData: CoverageOverviewRuleAttributes,
  invalidMitreIds: string[]
): void {
  if (!ruleData) {
    return;
  }

  const rule: CoverageOverviewRuleWithInvalidMitre = {
    id: ruleId,
    name: ruleData.name,
    invalidMitreIds,
  };

  if (ruleData.activity === CoverageOverviewRuleActivity.Enabled) {
    container.enabledRules.push(rule);
  } else if (ruleData.activity === CoverageOverviewRuleActivity.Disabled) {
    container.disabledRules.push(rule);
  }
}

function addRule(
  container: {
    enabledRules: CoverageOverviewRule[];
    disabledRules: CoverageOverviewRule[];
    availableRules: CoverageOverviewRule[];
  },
  ruleId: string,
  ruleData: CoverageOverviewRuleAttributes
): void {
  if (!ruleData) {
    return;
  }

  if (ruleData.activity === CoverageOverviewRuleActivity.Enabled) {
    container.enabledRules.push({
      id: ruleId,
      name: ruleData.name,
    });
  } else if (ruleData.activity === CoverageOverviewRuleActivity.Disabled) {
    container.disabledRules.push({
      id: ruleId,
      name: ruleData.name,
    });
  }

  // When we add support for available (not installed) rules to this feature, add the following here:
  // else if (ruleData.activity === CoverageOverviewRuleActivity.Available) {
  //   container.availableRules.push({
  //     id: ruleId,
  //     name: ruleData.name,
  //   });
  // }
}
