/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/entity_analytics/types';
import { buildAttackMatrix } from './overview_metrics';
import { captureExecutiveBrief, hasExecutiveBriefAccessLoss } from './executive_brief_snapshot';
import type { ExecutiveBriefInputs } from './executive_brief_snapshot';
import type { BriefAgentSourceStatus, ExecutiveBriefCoverage } from './executive_brief_agents';

const inputs = (): ExecutiveBriefInputs => {
  const tactics = [{ tactic: 'Credential Access', alertCount: 3, techniques: [] }];
  return {
    spaceId: 'space-one',
    stats: {
      totalEntities: 2,
      highCount: 2,
      criticalCount: 0,
      byType: [{ type: EntityType.host, count: 2, scoredCount: 2, avgRisk: 75 }],
      byLevel: [{ type: EntityType.host, level: 'High', count: 2, avgRisk: 75 }],
    },
    entities: [
      {
        id: 'host:one',
        name: 'Snapshot host',
        type: EntityType.host,
        identifierValue: 'one',
        riskScoreNorm: 75,
        riskLevel: 'High',
        criticality: undefined,
        source: undefined,
        lastSeen: undefined,
      },
    ],
    tactics,
    rules: [{ ruleName: 'Snapshot rule', alertCount: 3, topSeverity: 'high' }],
    matrix: buildAttackMatrix(tactics),
    leads: [],
    leadsCount: 2,
    anomalies: [
      { entityId: 'host:one', entityName: 'Snapshot anomaly', entityType: 'host', maxScore: 65 },
    ],
    coverage: {
      entityStore: 'available',
      entities: 'available',
      detections: 'available',
      anomalies: 'available',
      huntingLeads: 'available',
    },
    agents: {
      lookbackDays: 30,
      providers: [
        {
          provider: 'codex',
          name: 'Codex',
          status: 'available',
          identityCount: 1,
          sessions: 4,
          toolObservations: 20,
          evaluatedSessions: 1,
          changedSessions: 1,
        },
        {
          provider: 'cursor',
          name: 'Cursor',
          status: 'available',
          identityCount: 1,
          sessions: 3,
          toolObservations: 12,
          evaluatedSessions: 0,
          changedSessions: 0,
        },
        {
          provider: 'agent_builder',
          name: 'Agent Builder',
          status: 'available',
          identityCount: 1,
          invocations: 9,
        },
      ],
      totals: {
        agentIdentities: 3,
        externalSessions: 7,
        toolObservations: 32,
        evaluatedSessions: 1,
        changedSessions: 1,
        builderInvocations: 9,
      },
      changedSessions: [],
      builderAgents: [],
      limitations: [],
    },
  };
};

it('uses one captured evidence set for metric values, prompt and drill-in identity', () => {
  const source = inputs();
  const snapshot = captureExecutiveBrief(source, 1000);
  expect(snapshot.capturedAt).toBe(1000);
  expect(snapshot.spaceId).toBe('space-one');
  expect(snapshot.data.kpis.find((kpi) => kpi.id === 'materialRisk')?.value).toBe(2);
  expect(snapshot.data.kpis.find((kpi) => kpi.id === 'activeSignals')?.value).toBe(3);
  expect(snapshot.prompt).toContain('"materialRiskEntities":2');
  expect(snapshot.prompt).toContain('"activeSignals":3');
  expect(snapshot.prompt).toContain('"externalSessions":7');
  expect(snapshot.data.agents).toEqual(snapshot.agents);
  expect(snapshot.data.coverage).toEqual(snapshot.coverage);
  expect(snapshot.entities[0].id).toBe(snapshot.data.topRisks[0].id);
  expect(snapshot.prompt).toContain(snapshot.data.topRisks[0].name);
});

it('preserves the original brief when query caches later replace their values', () => {
  const source = inputs();
  const snapshot = captureExecutiveBrief(source, 1000);
  const refreshed = {
    ...source,
    entities: [{ ...source.entities[0], name: 'New snapshot host', riskScoreNorm: 90 }],
    agents: { ...source.agents, totals: { ...source.agents.totals, externalSessions: 8 } },
  };
  const next = captureExecutiveBrief(refreshed, 2000);
  expect(snapshot.data.topRisks[0].name).toBe('Snapshot host');
  expect(snapshot.prompt).not.toContain('New snapshot host');
  expect(snapshot.agents.totals.externalSessions).toBe(7);
  expect(next.data.topRisks[0].name).toBe('New snapshot host');
  expect(next.agents.totals.externalSessions).toBe(8);
  expect(next.capturedAt).toBe(2000);
  expect(hasExecutiveBriefAccessLoss(snapshot, refreshed)).toBe(false);
});

it('removes unavailable cached evidence rather than exporting or prompting with stale facts', () => {
  const source = inputs();
  const snapshot = captureExecutiveBrief(
    {
      ...source,
      coverage: {
        entityStore: 'unavailable',
        entities: 'unavailable',
        detections: 'unavailable',
        anomalies: 'unavailable',
        huntingLeads: 'unavailable',
      },
    },
    1000
  );
  expect(snapshot.stats).toBeUndefined();
  expect(snapshot.entities).toEqual([]);
  expect(snapshot.data.topRisks).toEqual([]);
  expect(snapshot.data.riskBands).toEqual([]);
  expect(snapshot.data.killChain.steps).toEqual([]);
  expect(snapshot.data.kpis.every((kpi) => kpi.value === undefined)).toBe(true);
  expect(snapshot.prompt).not.toContain('Snapshot host');
  expect(snapshot.prompt).not.toContain('Snapshot rule');
  expect(snapshot.prompt).not.toContain('Snapshot anomaly');
  expect(snapshot.agents.totals.externalSessions).toBe(7);
});

it('keeps a disabled hunting-lead source from implying zero combined active signals', () => {
  const source = inputs();
  const snapshot = captureExecutiveBrief(
    { ...source, coverage: { ...source.coverage, huntingLeads: 'disabled' } },
    1000
  );
  expect(snapshot.data.kpis.find((kpi) => kpi.id === 'activeSignals')?.value).toBeUndefined();
  expect(snapshot.prompt).not.toContain('"activeSignals":');
  expect(snapshot.prompt).toContain('Snapshot anomaly');
});

it('invalidates a frozen brief when the active space changes', () => {
  const source = inputs();
  expect(
    hasExecutiveBriefAccessLoss(captureExecutiveBrief(source, 1000), {
      ...source,
      spaceId: 'space-two',
    })
  ).toBe(true);
});

it.each<keyof ExecutiveBriefCoverage>([
  'entityStore',
  'entities',
  'detections',
  'anomalies',
  'huntingLeads',
])('invalidates a frozen brief after %s access is lost', (key) => {
  const source = inputs();
  expect(
    hasExecutiveBriefAccessLoss(captureExecutiveBrief(source, 1000), {
      ...source,
      coverage: { ...source.coverage, [key]: 'unavailable' },
    })
  ).toBe(true);
});

it.each<BriefAgentSourceStatus>(['partial', 'unavailable'])(
  'invalidates a complete external-agent snapshot when the source becomes %s',
  (status) => {
    const source = inputs();
    const agents = {
      ...source.agents,
      providers: source.agents.providers.map((provider) =>
        provider.provider === 'cursor' ? { ...provider, status } : provider
      ),
    };
    expect(
      hasExecutiveBriefAccessLoss(captureExecutiveBrief(source, 1000), { ...source, agents })
    ).toBe(true);
  }
);

it('invalidates Builder invocation evidence even when definitions remain readable and status was already partial', () => {
  const source = inputs();
  const agents = {
    ...source.agents,
    providers: source.agents.providers.map((provider) =>
      provider.provider === 'agent_builder' ? { ...provider, status: 'partial' as const } : provider
    ),
  };
  const snapshot = captureExecutiveBrief({ ...source, agents }, 1000);
  const unavailableActivity = {
    ...agents,
    providers: agents.providers.map((provider) =>
      provider.provider === 'agent_builder' ? { ...provider, invocations: undefined } : provider
    ),
  };
  expect(hasExecutiveBriefAccessLoss(snapshot, { ...source, agents: unavailableActivity })).toBe(
    true
  );
});

it('keeps a snapshot with an already unavailable source while other source counts refresh', () => {
  const source = inputs();
  const coverage: ExecutiveBriefCoverage = { ...source.coverage, detections: 'unavailable' };
  const snapshot = captureExecutiveBrief({ ...source, coverage }, 1000);
  expect(hasExecutiveBriefAccessLoss(snapshot, { ...source, coverage })).toBe(false);
});

it('retains known anomalous entities but withholds totals when anomaly evidence is partial', () => {
  const source = inputs();
  const partial = { ...source, coverage: { ...source.coverage, anomalies: 'partial' as const } };
  const snapshot = captureExecutiveBrief(partial, 2000);
  expect(snapshot.prompt).toContain('Snapshot anomaly');
  expect(snapshot.data.kpis.find((kpi) => kpi.id === 'activeSignals')?.value).toBeUndefined();
  expect(snapshot.prompt).not.toContain('"activeSignals":');
  expect(hasExecutiveBriefAccessLoss(captureExecutiveBrief(source, 1000), partial)).toBe(true);
});

it('invalidates a partially readable anomaly snapshot if access is subsequently lost', () => {
  const source = inputs();
  const snapshot = captureExecutiveBrief(
    { ...source, coverage: { ...source.coverage, anomalies: 'partial' } },
    1000
  );
  expect(snapshot.prompt).toContain('Snapshot anomaly');
  expect(
    hasExecutiveBriefAccessLoss(snapshot, {
      ...source,
      coverage: { ...source.coverage, anomalies: 'unavailable' },
    })
  ).toBe(true);
});
