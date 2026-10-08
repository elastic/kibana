/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttackStage,
  AttackStageFlag,
  AttackStagesSummary,
} from '../../../../../common/entity_analytics/executive_brief/types';
import {
  LIMITED_COVERAGE_MAX_EFFECTIVE_RULES,
  LIMITED_COVERAGE_MIN_EFFECTIVE_RATIO,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type { EvidenceRegistry } from '../snapshot/evidence_registry';
import type { AlertsByTactic } from './alerts_by_tactic';
import type { AttackDiscoveryTactics } from './attack_discovery_tactics';
import type { AnomaliesByTactic } from './anomalies';
import type { DetectionCoverage, RuleTechnique } from './detection_coverage';
import type { TacticLookup } from './mitre_tactics';
import { MAX_TOP_RULES_PER_TACTIC } from './constants';

export interface StageFlagInput {
  alerts: number;
  attackDiscoveries: number;
  mlAnomalies: number;
  /** Alerts attributed to the tactic by a rule's own threat mapping (not ECS fallback). */
  alertsViaRule: number;
  enabled: number;
  effective: number;
}

/**
 * Flags (investigation 08 §6.2):
 * - `no_working_detection`: activity seen only through ML / Attack Discovery / external alerts
 *   (no rule-mapped alert) and no effective rule.
 * - `limited_coverage`: any activity and (effective <= 2 or effective / enabled < 50%).
 */
export const computeStageFlag = ({
  alerts,
  attackDiscoveries,
  mlAnomalies,
  alertsViaRule,
  enabled,
  effective,
}: StageFlagInput): AttackStageFlag => {
  const hasActivity = alerts > 0 || attackDiscoveries > 0 || mlAnomalies > 0;
  if (!hasActivity) return 'none';
  if (effective === 0 && alertsViaRule === 0) return 'no_working_detection';
  const lowCount = effective <= LIMITED_COVERAGE_MAX_EFFECTIVE_RULES;
  const lowRatio = enabled > 0 && effective / enabled < LIMITED_COVERAGE_MIN_EFFECTIVE_RATIO;
  return lowCount || lowRatio ? 'limited_coverage' : 'none';
};

export interface AttackStagesInput {
  lookup: TacticLookup;
  alerts?: AlertsByTactic;
  coverage?: DetectionCoverage;
  attackDiscovery?: AttackDiscoveryTactics;
  anomalies?: AnomaliesByTactic;
}

const registerRule = (
  registry: EvidenceRegistry,
  ruleId: string,
  tacticId: string | undefined,
  alerts: AlertsByTactic | undefined,
  coverage: DetectionCoverage | undefined
): `RULE-${string}` => {
  const summary = alerts?.rules.get(ruleId);
  const info = coverage?.rulesById.get(ruleId);
  const tacticFallback = tacticId ? [tacticId] : [];
  return registry.rule({
    kind: 'rule',
    ruleId,
    name: summary?.name ?? info?.name ?? ruleId,
    severity: summary?.severity ?? 'medium',
    alertCount: summary?.alertCount ?? 0,
    tacticIds: info?.tacticIds ?? tacticFallback,
    techniqueIds: info?.techniqueIds ?? [],
  });
};

/** Most frequent technique among the top rules, weighted by each rule's alert count. */
const pickTopTechnique = (
  tacticId: string,
  topRuleIds: readonly string[],
  alerts: AlertsByTactic | undefined,
  coverage: DetectionCoverage | undefined
): RuleTechnique | undefined => {
  const weights = new Map<string, { technique: RuleTechnique; weight: number }>();
  for (const ruleId of topRuleIds) {
    const techniques = coverage?.rulesById.get(ruleId)?.techniquesByTactic.get(tacticId) ?? [];
    const weight = alerts?.rules.get(ruleId)?.alertCount ?? 1;
    for (const technique of techniques) {
      const existing = weights.get(technique.id);
      weights.set(technique.id, { technique, weight: (existing?.weight ?? 0) + weight });
    }
  }
  let best: { technique: RuleTechnique; weight: number } | undefined;
  for (const candidate of weights.values()) {
    if (!best || candidate.weight > best.weight) best = candidate;
  }
  return best?.technique;
};

/**
 * Merges alert activity, Attack Discovery, ML and rule coverage into one stage per tactic that
 * has activity or enabled rules, in managed MITRE order. Registers tactics and top rules.
 */
export const buildAttackStages = (
  { lookup, alerts, coverage, attackDiscovery, anomalies }: AttackStagesInput,
  registry: EvidenceRegistry
): AttackStagesSummary => {
  const tacticIds = new Set<string>();
  for (const [tacticId] of alerts?.byTactic ?? []) tacticIds.add(tacticId);
  for (const [tacticId] of attackDiscovery?.byTactic ?? []) tacticIds.add(tacticId);
  for (const [tacticId] of anomalies?.byTactic ?? []) tacticIds.add(tacticId);
  for (const [tacticId, { enabled }] of coverage?.byTactic ?? []) {
    if (enabled > 0) tacticIds.add(tacticId);
  }

  const orderedIds = [...tacticIds].sort(
    (a, b) => lookup.positionOf(a) - lookup.positionOf(b) || a.localeCompare(b)
  );

  const stages = orderedIds.map((tacticId): AttackStage => {
    const activity = alerts?.byTactic.get(tacticId);
    const tacticCoverage = coverage?.byTactic.get(tacticId) ?? { enabled: 0, effective: 0 };
    const observed = {
      alerts: (activity?.viaRule ?? 0) + (activity?.viaEcs ?? 0),
      attackDiscoveries: attackDiscovery?.byTactic.get(tacticId) ?? 0,
      mlAnomalies: anomalies?.byTactic.get(tacticId) ?? 0,
    };
    const topRuleIds = (activity?.topRuleIds ?? []).slice(0, MAX_TOP_RULES_PER_TACTIC);
    const topTechnique = pickTopTechnique(tacticId, topRuleIds, alerts, coverage);
    const topRuleEvidenceIds = topRuleIds.map((ruleId) =>
      registerRule(registry, ruleId, tacticId, alerts, coverage)
    );

    return {
      evidenceId: registry.tactic(tacticId),
      tacticId,
      tacticName: lookup.nameOf(tacticId),
      position: lookup.byId.get(tacticId)?.position ?? lookup.ordered.length,
      ...(topTechnique ? { topTechnique } : {}),
      observed,
      coverage: tacticCoverage,
      flag: computeStageFlag({
        ...observed,
        alertsViaRule: activity?.viaRule ?? 0,
        enabled: tacticCoverage.enabled,
        effective: tacticCoverage.effective,
      }),
      topRuleEvidenceIds,
    };
  });

  const totalAlerts = alerts?.totalAlerts ?? 0;
  const unmappedAlerts = alerts?.unmapped.alerts ?? 0;
  return {
    stages,
    unmapped: {
      alerts: unmappedAlerts,
      share: totalAlerts > 0 ? Math.round((unmappedAlerts / totalAlerts) * 100) / 100 : 0,
      topRuleEvidenceIds: (alerts?.unmapped.topRuleIds ?? []).map((ruleId) =>
        registerRule(registry, ruleId, undefined, alerts, coverage)
      ),
    },
  };
};
