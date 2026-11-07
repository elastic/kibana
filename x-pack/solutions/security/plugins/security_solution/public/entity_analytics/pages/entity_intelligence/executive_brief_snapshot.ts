/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HuntingLead } from '../../components/threat_hunting/top_threat_hunting_leads/types';
import type { IntelligenceEntity } from './common';
import type { CompactAnomaly } from './hooks/use_compact_anomalies';
import type { EntityStoreStats } from './hooks/use_entity_store_stats';
import type { RuleCoverage, TacticCoverage } from './hooks/use_tactic_coverage';
import type { AttackMatrixModel, ExecutiveBriefData } from './overview_metrics';
import {
  assembleExecutiveBriefData,
  buildAttackMatrix,
  buildExecutiveBriefPrompt,
} from './overview_metrics';
import type { ExecutiveBriefAgentSnapshot, ExecutiveBriefCoverage } from './executive_brief_agents';

export interface ExecutiveBriefInputs {
  spaceId: string | undefined;
  stats: EntityStoreStats | undefined;
  entities: readonly IntelligenceEntity[];
  tactics: readonly TacticCoverage[];
  rules: readonly RuleCoverage[];
  matrix: AttackMatrixModel;
  leads: readonly HuntingLead[];
  leadsCount: number;
  anomalies: readonly CompactAnomaly[];
  coverage: ExecutiveBriefCoverage;
  agents: ExecutiveBriefAgentSnapshot;
}

export interface ExecutiveBriefSnapshot {
  spaceId: string | undefined;
  capturedAt: number;
  coverage: ExecutiveBriefCoverage;
  agents: ExecutiveBriefAgentSnapshot;
  stats: EntityStoreStats | undefined;
  entities: readonly IntelligenceEntity[];
  data: ExecutiveBriefData;
  prompt: string;
}

export const captureExecutiveBrief = (
  input: ExecutiveBriefInputs,
  capturedAt: number
): ExecutiveBriefSnapshot => {
  const { coverage, agents } = input;
  const stats =
    coverage.entityStore === 'available' || coverage.entityStore === 'partial'
      ? input.stats
      : undefined;
  const entities =
    coverage.entities === 'available' || coverage.entities === 'partial' ? input.entities : [];
  const tactics =
    coverage.detections === 'available' || coverage.detections === 'partial' ? input.tactics : [];
  const rules =
    coverage.detections === 'available' || coverage.detections === 'partial' ? input.rules : [];
  const matrix =
    coverage.detections === 'available' || coverage.detections === 'partial'
      ? input.matrix
      : buildAttackMatrix([]);
  const leads =
    coverage.huntingLeads === 'available' || coverage.huntingLeads === 'partial' ? input.leads : [];
  const anomalies =
    coverage.anomalies === 'available' || coverage.anomalies === 'partial' ? input.anomalies : [];
  const activeSignals =
    (coverage.huntingLeads === 'available' || coverage.huntingLeads === 'partial'
      ? input.leadsCount
      : 0) + anomalies.length;
  return {
    spaceId: input.spaceId,
    capturedAt,
    coverage,
    agents,
    stats,
    entities,
    data: assembleExecutiveBriefData({ stats, entities, matrix, activeSignals, agents, coverage }),
    prompt: buildExecutiveBriefPrompt({
      stats,
      entities,
      tactics,
      rules,
      leads,
      anomalies,
      activeSignals,
      observedTactics:
        coverage.detections === 'available' || coverage.detections === 'partial'
          ? matrix.observedTacticCount
          : undefined,
      agents,
      coverage,
    }),
  };
};

export const hasExecutiveBriefAccessLoss = (
  snapshot: ExecutiveBriefSnapshot,
  current: Pick<ExecutiveBriefInputs, 'spaceId' | 'coverage' | 'agents'>
): boolean =>
  snapshot.spaceId !== current.spaceId ||
  (Object.keys(snapshot.coverage) as Array<keyof ExecutiveBriefCoverage>).some(
    (key) =>
      ((snapshot.coverage[key] === 'available' || snapshot.coverage[key] === 'partial') &&
        current.coverage[key] === 'unavailable') ||
      (snapshot.coverage[key] === 'available' && current.coverage[key] === 'partial')
  ) ||
  snapshot.agents.providers.some((previous) => {
    const next = current.agents.providers.find(
      (provider) => provider.provider === previous.provider
    );
    if (!next) return true;
    return (
      (previous.status !== 'unavailable' &&
        previous.status !== 'loading' &&
        next.status === 'unavailable') ||
      ((previous.status === 'available' || previous.status === 'empty') &&
        next.status === 'partial') ||
      (previous.invocations !== undefined && next.invocations === undefined)
    );
  });
