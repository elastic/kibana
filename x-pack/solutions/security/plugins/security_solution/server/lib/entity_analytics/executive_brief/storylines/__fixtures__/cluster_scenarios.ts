/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryResponse } from '../../../../../../common/entity_analytics/executive_brief/types';
import {
  EUID,
  FIXTURE_NOW,
} from '../../../../../../common/entity_analytics/executive_brief/__fixtures__/snapshot';
import type { ClusterEdge, ClusterEntityFacts, ClusterInput, ClusterSeed } from '../types';

export { EUID, FIXTURE_NOW };

export const day = (offset: number, hour = 9): string => {
  const date = new Date(FIXTURE_NOW);
  date.setUTCDate(date.getUTCDate() + offset);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

export const NOISE_HOST = 'host:noise-host-07';
export const NOISE_USER_2 = 'user:b.okafor@acme.com@okta';

export const facts = (
  entries: Array<Partial<ClusterEntityFacts> & Pick<ClusterEntityFacts, 'euid' | 'type'>>
): Record<string, ClusterEntityFacts> =>
  Object.fromEntries(entries.map((entry) => [entry.euid, entry]));

export const SCENARIO_FACTS = facts([
  { euid: EUID.rodriguez, type: 'user', riskScoreNorm: 75 },
  { euid: EUID.laptopFin, type: 'host', riskScoreNorm: 76, criticality: 'medium_impact' },
  { euid: EUID.jumpBox, type: 'host', riskScoreNorm: 72, criticality: 'high_impact' },
  { euid: EUID.prodHost, type: 'host', riskScoreNorm: 78, criticality: 'extreme_impact' },
  { euid: EUID.chen, type: 'user', riskScoreNorm: 64 },
  { euid: EUID.laptopMkt, type: 'host', riskScoreNorm: 51, criticality: 'low_impact' },
  { euid: EUID.svcBuild, type: 'user', riskScoreNorm: 55 },
  { euid: EUID.buildRunner, type: 'host', riskScoreNorm: 62, criticality: 'medium_impact' },
  { euid: EUID.fileServer, type: 'host', riskScoreNorm: 44 },
  {
    euid: EUID.dc,
    type: 'host',
    riskScoreNorm: 30,
    criticality: 'extreme_impact',
    interactionDegree: 37,
  },
  { euid: EUID.noiseUser, type: 'user', riskScoreNorm: 71 },
  { euid: NOISE_USER_2, type: 'user', riskScoreNorm: 70 },
  { euid: NOISE_HOST, type: 'host', riskScoreNorm: 20 },
]);

export const SCENARIO_SEEDS: ClusterSeed[] = [
  {
    kind: 'attack_discovery',
    refKey: 'ad:s1',
    entityEuids: [EUID.rodriguez, EUID.laptopFin, EUID.jumpBox, EUID.prodHost],
    severity: 0.92,
    at: day(-1, 11),
  },
  { kind: 'lead', refKey: 'lead:s1', entityEuids: [EUID.rodriguez], severity: 1, at: day(-1, 6) },
  {
    kind: 'material_risk',
    refKey: 'ent:prod',
    entityEuids: [EUID.prodHost],
    severity: 0.78,
    at: day(-1, 10),
  },
  {
    kind: 'attack_discovery',
    refKey: 'ad:s2',
    entityEuids: [EUID.chen, EUID.laptopMkt],
    severity: 0.81,
    at: day(-2, 16),
  },
  {
    kind: 'risk_mover',
    refKey: 'ent:runner',
    entityEuids: [EUID.buildRunner],
    severity: 0.62,
    at: day(-1, 18),
  },
  // Noise: High-risk user with only daily logons; another with no links at all.
  {
    kind: 'material_risk',
    refKey: 'ent:noise1',
    entityEuids: [EUID.noiseUser],
    severity: 0.71,
    at: day(-1, 8),
  },
  {
    kind: 'risk_mover',
    refKey: 'ent:noise2',
    entityEuids: [NOISE_USER_2],
    severity: 0.7,
    at: day(-1, 7),
  },
];

const edge = (
  type: ClusterEdge['type'],
  from: string,
  to: string,
  refKeys: string[] = []
): ClusterEdge => ({ type, from, to, refKeys });

export const SCENARIO_EDGES: ClusterEdge[] = [
  edge('co_alert', EUID.rodriguez, EUID.laptopFin, ['rule:1']),
  edge('co_alert', EUID.rodriguez, EUID.jumpBox, ['rule:2', 'rule:3']),
  edge('co_alert', EUID.rodriguez, EUID.prodHost, ['rule:4']),
  edge('accesses_frequently', EUID.rodriguez, EUID.laptopFin),
  edge('accesses_infrequently', EUID.rodriguez, EUID.jumpBox),
  edge('accesses_infrequently', EUID.rodriguez, EUID.prodHost),
  edge('owns', EUID.chen, EUID.laptopMkt),
  edge('co_alert', EUID.svcBuild, EUID.buildRunner, ['rule:8', 'rule:9']),
  edge('communicates_with', EUID.buildRunner, EUID.fileServer),
  // The domain controller touches S1 and S3 with merge-grade edges: it must not bridge them.
  edge('accesses_infrequently', EUID.rodriguez, EUID.dc),
  edge('accesses_infrequently', EUID.svcBuild, EUID.dc),
  edge('co_alert', EUID.buildRunner, EUID.dc, ['rule:10']),
  // Noise
  edge('accesses_frequently', EUID.noiseUser, NOISE_HOST),
];

export const SCENARIO_RESPONSES: Record<string, StoryResponse> = {
  [EUID.chen]: {
    state: 'in_progress',
    cases: [
      { evidenceId: 'CASE-1', caseId: 'case-s2', title: 'MFA bombing', status: 'in-progress' },
    ],
    alerts: { open: 0, acknowledged: 6, closed: 0 },
  },
};

export const scenarioInput = (overrides: Partial<ClusterInput> = {}): ClusterInput => ({
  seeds: SCENARIO_SEEDS,
  edges: SCENARIO_EDGES,
  facts: SCENARIO_FACTS,
  now: FIXTURE_NOW,
  ...overrides,
});

/** Park-Miller LCG, so shuffles are reproducible. */
export const shuffled = <T>(items: readonly T[], seed: number): T[] => {
  const result = [...items];
  let state = (seed % 2147483646) + 1;
  const next = (): number => {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646;
  };
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(next() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};
