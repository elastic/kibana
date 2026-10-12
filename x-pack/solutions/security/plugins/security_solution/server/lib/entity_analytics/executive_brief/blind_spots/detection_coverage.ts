/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnapshotContext } from '../snapshot/context';
import { findRules } from '../../../detection_engine/rule_management/logic/search/find_rules';
import { MAX_RULES_FETCH, MITRE_ATTACK_FRAMEWORK_NAME } from './constants';
import type { TacticLookup } from './mitre_tactics';

/** The subset of a rule this reducer reads (a structural slice of SanitizedRule). */
export interface CoverageRuleInput {
  id: string;
  name: string;
  params: {
    threat?: ReadonlyArray<{
      framework: string;
      tactic: { id: string; name?: string };
      technique?: ReadonlyArray<{
        id: string;
        name?: string;
        subtechnique?: ReadonlyArray<{ id: string; name?: string }>;
      }>;
    }>;
    relatedIntegrations?: ReadonlyArray<{ package: string }>;
  };
  lastRun?: { outcome?: string } | null;
}

export interface RuleTechnique {
  id: string;
  name: string;
}

export interface CoverageRuleInfo {
  ruleId: string;
  name: string;
  tacticIds: string[];
  /** Pairing-safe: techniques come from this rule's own `threat` entry for the tactic. */
  techniquesByTactic: Map<string, RuleTechnique[]>;
  techniqueIds: string[];
  effective: boolean;
}

export interface TacticCoverage {
  enabled: number;
  /** enabled − (relies only on uninstalled integrations) − (last run failed) */
  effective: number;
}

export interface DetectionCoverage {
  byTactic: Map<string, TacticCoverage>;
  rulesById: Map<string, CoverageRuleInfo>;
  enabledRules: number;
  /** Enabled rules with no ATT&CK mapping. */
  unmappedRules: number;
  /** False when Fleet was unavailable, so integration availability was not subtracted. */
  integrationsChecked: boolean;
}

/** True when the rule lists related integrations and none of them is installed. */
export const reliesOnlyOnUninstalledIntegrations = (
  relatedIntegrations: CoverageRuleInput['params']['relatedIntegrations'],
  installedPackages: ReadonlySet<string>
): boolean =>
  !!relatedIntegrations &&
  relatedIntegrations.length > 0 &&
  relatedIntegrations.every(({ package: pkg }) => !installedPackages.has(pkg));

const extractRuleThreat = (
  rule: CoverageRuleInput,
  lookup: TacticLookup
): { techniquesByTactic: Map<string, RuleTechnique[]>; techniqueIds: string[] } => {
  const techniquesByTactic = new Map<string, RuleTechnique[]>();
  const techniqueIds = new Set<string>();
  const attackThreats = (rule.params.threat ?? []).filter(
    ({ framework }) => framework === MITRE_ATTACK_FRAMEWORK_NAME
  );
  for (const threat of attackThreats) {
    const tacticId = lookup.resolveId(threat.tactic.id) ?? threat.tactic.id;
    const techniques = techniquesByTactic.get(tacticId) ?? [];
    for (const technique of threat.technique ?? []) {
      techniqueIds.add(technique.id);
      const subtechniques = technique.subtechnique ?? [];
      if (subtechniques.length === 0) {
        techniques.push({ id: technique.id, name: technique.name ?? technique.id });
      }
      for (const sub of subtechniques) {
        techniqueIds.add(sub.id);
        techniques.push({ id: sub.id, name: sub.name ?? sub.id });
      }
    }
    techniquesByTactic.set(tacticId, techniques);
  }
  return { techniquesByTactic, techniqueIds: [...techniqueIds] };
};

/** Pure reducer: enabled rules in, per-tactic enabled / effective counts out. */
export const reduceDetectionCoverage = ({
  rules,
  installedPackages,
  lookup,
}: {
  rules: readonly CoverageRuleInput[];
  /** undefined when Fleet could not be queried. */
  installedPackages: ReadonlySet<string> | undefined;
  lookup: TacticLookup;
}): DetectionCoverage => {
  const byTactic = new Map<string, TacticCoverage>();
  const rulesById = new Map<string, CoverageRuleInfo>();
  let unmappedRules = 0;

  for (const rule of rules) {
    const { techniquesByTactic, techniqueIds } = extractRuleThreat(rule, lookup);
    const failed = rule.lastRun?.outcome === 'failed';
    const missingIntegrations =
      installedPackages !== undefined &&
      reliesOnlyOnUninstalledIntegrations(rule.params.relatedIntegrations, installedPackages);
    const effective = !failed && !missingIntegrations;
    const tacticIds = [...techniquesByTactic.keys()];

    rulesById.set(rule.id, {
      ruleId: rule.id,
      name: rule.name,
      tacticIds,
      techniquesByTactic,
      techniqueIds,
      effective,
    });

    if (tacticIds.length === 0) {
      unmappedRules += 1;
    }
    for (const tacticId of tacticIds) {
      const entry = byTactic.get(tacticId) ?? { enabled: 0, effective: 0 };
      entry.enabled += 1;
      if (effective) entry.effective += 1;
      byTactic.set(tacticId, entry);
    }
  }

  return {
    byTactic,
    rulesById,
    enabledRules: rules.length,
    unmappedRules,
    integrationsChecked: installedPackages !== undefined,
  };
};

const fetchInstalledPackages = async (ctx: SnapshotContext): Promise<Set<string> | undefined> => {
  const { fleetPackageService } = ctx.services;
  if (!fleetPackageService) return undefined;
  try {
    const packages = await fleetPackageService.asScoped(ctx.request).getPackages();
    return new Set(packages.filter(({ status }) => status === 'installed').map(({ name }) => name));
  } catch (error) {
    ctx.logger.debug(
      `Executive brief: Fleet packages unavailable, integration availability not checked: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};

/**
 * Enabled-only coverage per tactic id. Deliberately not the Agent Builder MITRE coverage tool,
 * which also counts disabled rules.
 */
export const fetchDetectionCoverage = async (
  ctx: SnapshotContext,
  lookup: TacticLookup
): Promise<DetectionCoverage> => {
  const { rulesClient } = ctx.services;
  if (!rulesClient) {
    throw new Error('rulesClient is not available');
  }
  // Same 10k cap as the coverage overview (rulesClient.find is bounded by max_result_window).
  const [rules, installedPackages] = await Promise.all([
    findRules({
      rulesClient,
      filter: 'alert.attributes.enabled: true',
      fields: ['name', 'params.threat', 'params.relatedIntegrations', 'lastRun'],
      page: 1,
      perPage: MAX_RULES_FETCH,
      sortField: undefined,
      sortOrder: undefined,
    }),
    fetchInstalledPackages(ctx),
  ]);
  return reduceDetectionCoverage({ rules: rules.data, installedPackages, lookup });
};
