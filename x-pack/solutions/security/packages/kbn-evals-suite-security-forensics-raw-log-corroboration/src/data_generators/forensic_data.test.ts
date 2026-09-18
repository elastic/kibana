/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import {
  cleanupSeededData,
  NETWORK_INDEX,
  PROCESS_INDEX,
  planSeedEvents,
  seedForensicTimeline,
} from './forensic_data';
import type { CorroborationScenario } from '../types';

const SCENARIO: CorroborationScenario = {
  id: 'unit-scenario',
  name: 'Unit scenario',
  description: 'Seeds one corroborated stage, one gap stage, one decoy stage.',
  narrative: 'narrative',
  alertIds: ['alert-1'],
  scope: {
    hosts: ['HOST-A'],
    timeRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T01:00:00.000Z' },
  },
  stages: [
    { id: 'execution', evidence: 'powershell from outlook', corroborated: true },
    { id: 'persistence', evidence: 'run key written', corroborated: false },
    {
      id: 'lateral',
      evidence: 'SMB to a peer host',
      corroborated: false,
      decoy: { host: 'HOST-B', outsideTime: true },
    },
  ],
  expected: {
    minCorroboratedCount: 1,
    maxCorroboratedCount: 1,
    minGapCount: 1,
    maxGapCount: 1,
    minConfidence: 0.5,
  },
};

describe('planSeedEvents', () => {
  it('seeds telemetry only for corroborated and decoy stages', () => {
    const plan = planSeedEvents(SCENARIO);

    // One process + one network document per seeded stage (execution + decoy);
    // the unseeded `persistence` stage contributes nothing, which is what makes
    // the scenario's "gap here" premise true.
    expect(plan).toHaveLength(4);
    expect(plan.map((event) => event.id)).toEqual([
      'unit-scenario-execution-proc-in-scope',
      'unit-scenario-execution-net-in-scope',
      'unit-scenario-lateral-proc-decoy',
      'unit-scenario-lateral-net-decoy',
    ]);
  });

  it('keeps every seeded document id inside the scenario namespace', () => {
    // Teardown deletes by id prefix, so an id outside the namespace would leak
    // seeded telemetry into the next run (and into sibling scenarios).
    for (const event of planSeedEvents(SCENARIO)) {
      expect(event.id.startsWith(`${SCENARIO.id}-`)).toBe(true);
    }
  });

  it('places a decoy out of scope by host and by time', () => {
    const decoys = planSeedEvents(SCENARIO).filter((event) => event.decoy);
    const inScope = planSeedEvents(SCENARIO).filter((event) => !event.decoy);

    expect(decoys).toHaveLength(2);
    for (const decoy of decoys) {
      expect(decoy.host).toBe('HOST-B');
      expect(Date.parse(decoy.timestamp)).toBeLessThan(Date.parse(SCENARIO.scope.timeRange.from));
    }
    for (const event of inScope) {
      expect(event.host).toBe('HOST-A');
      expect(event.timestamp).toBe(SCENARIO.scope.timeRange.from);
    }
  });

  it('writes process documents to the process index and network documents to the network index', () => {
    for (const event of planSeedEvents(SCENARIO)) {
      expect([PROCESS_INDEX, NETWORK_INDEX]).toContain(event.index);
      const expectedIndex = event.id.includes('-proc-') ? PROCESS_INDEX : NETWORK_INDEX;
      expect(event.index).toBe(expectedIndex);
    }
  });
});

describe('seedForensicTimeline', () => {
  it('bulk-indexes with explicit ids and refreshes so the rows are queryable', async () => {
    const bulk = jest.fn().mockResolvedValue({ errors: false });
    const plan = planSeedEvents(SCENARIO);

    await seedForensicTimeline({
      esClient: { bulk } as unknown as Client,
      scenario: SCENARIO,
    });

    expect(bulk).toHaveBeenCalledTimes(1);
    const [params] = bulk.mock.calls[0];

    // The bulk API takes `operations` (index action + document pairs), NOT the
    // legacy `body` alias, and each action must carry `_id` so teardown can
    // find the documents by id prefix.
    expect(params.body).toBeUndefined();
    expect(params.refresh).toBe(true);
    expect(params.operations).toHaveLength(plan.length * 2);
    expect(params.operations[0]).toEqual({
      index: { _index: plan[0].index, _id: plan[0].id },
    });
  });

  it('does not call the bulk API when the scenario seeds nothing', async () => {
    const bulk = jest.fn();
    await seedForensicTimeline({
      esClient: { bulk } as unknown as Client,
      scenario: {
        ...SCENARIO,
        stages: [{ id: 'execution', evidence: 'none', corroborated: false }],
      },
    });

    expect(bulk).not.toHaveBeenCalled();
  });

  it('fails setup when the bulk reports per-item failures', async () => {
    // Regression: the response used to be discarded, so a partial bulk failure
    // left the scenario under-seeded and the eval blamed the worker for a gap
    // the seeder created.
    const bulk = jest.fn().mockResolvedValue({
      errors: true,
      items: [
        { index: { error: { type: 'mapper_parsing_exception', reason: 'failed to parse' } } },
      ],
    });

    await expect(
      seedForensicTimeline({ esClient: { bulk } as unknown as Client, scenario: SCENARIO })
    ).rejects.toThrow(/bulk index failed for scenario "unit-scenario"/);
  });
});

describe('cleanupSeededData', () => {
  it('deletes only the two seeded indices, by scenario prefix plus delimiter', async () => {
    // Teardown used to fan a delete-by-query across every `logs-*` index with a
    // bare `prefix: scenarioId`: on a shared eval stack that could match a sibling
    // scenario whose id merely STARTS with this one, could reach unrelated log
    // indices, and could fail outright on a restricted index. Both halves are
    // pinned here.
    const deleteByQuery = jest.fn().mockResolvedValue({ deleted: 4 });

    await cleanupSeededData({ deleteByQuery } as unknown as Client, SCENARIO.id);

    expect(deleteByQuery).toHaveBeenCalledWith({
      index: [PROCESS_INDEX, NETWORK_INDEX],
      ignore_unavailable: true,
      query: { prefix: { _id: `${SCENARIO.id}-` } },
    });
  });
});
