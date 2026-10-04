/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { CorroborationScenario, NarrativeStage } from '../types';

interface SeedParams {
  esClient: Client;
  scenario: CorroborationScenario;
}

const OUT_OF_SCOPE_OFFSET_MS = 24 * 60 * 60 * 1000;

export const PROCESS_INDEX = 'logs-endpoint.events.process-default';
export const NETWORK_INDEX = 'logs-endpoint.events.network-default';

export interface PlannedSeedEvent {
  index: string;
  /** Deterministic id: `<scenarioId>-<stageId>-<proc|net>-<in-scope|decoy>`. */
  id: string;
  host: string;
  timestamp: string;
  /** True when the event is deliberately out of scope for its scenario. */
  decoy: boolean;
  document: Record<string, unknown>;
}

/**
 * Timestamp a stage's telemetry is seeded at.
 *
 * A decoy with `outsideTime` is placed a day before the scenario window, so the
 * event is a real, shape-matching log line that is nonetheless out of scope.
 */
const timestampFor = (scenario: CorroborationScenario, stage: NarrativeStage): string => {
  const { from } = scenario.scope.timeRange;
  if (!stage.decoy?.outsideTime) return from;
  return new Date(Date.parse(from) - OUT_OF_SCOPE_OFFSET_MS).toISOString();
};

/**
 * Host a stage's telemetry is seeded on.
 *
 * Explicit `stage.host` wins: in a multi-host scenario the stage's evidence
 * names which machine the event happened on, and defaulting to `scope.hosts[0]`
 * seeded the domain-controller beacon on the workstation instead — the worker
 * was then scored for reporting only the stages it could actually see.
 */
const hostFor = (scenario: CorroborationScenario, stage: NarrativeStage): string =>
  stage.host ?? stage.decoy?.host ?? scenario.scope.hosts[0];

/**
 * Pure seed plan for one scenario: which documents go where, and when.
 *
 * Seeding is driven by `scenario.stages`: a corroborated stage gets in-scope
 * telemetry, a `decoy` stage gets telemetry that is deliberately out of scope,
 * and every other stage gets none. Previously the same two events were written
 * for every scenario, so scenarios whose premise is "no telemetry" or "a gap
 * here" were run against data that contradicted them.
 *
 * Exported (and pure) so `dataset_invariants.test.ts` can assert that the plan
 * respects each scenario's declared scope instead of re-deriving the seeder's
 * behaviour from the dataset by hand.
 */
export const planSeedEvents = (scenario: CorroborationScenario): PlannedSeedEvent[] => {
  const planned: PlannedSeedEvent[] = [];

  const seededStages = scenario.stages.filter(
    (stage) => stage.corroborated || stage.decoy !== undefined
  );

  for (const stage of seededStages) {
    const host = hostFor(scenario, stage);
    const timestamp = timestampFor(scenario, stage);
    const isDecoy = stage.decoy !== undefined;
    const suffix = isDecoy ? 'decoy' : 'in-scope';

    // Process telemetry: powershell spawned by outlook, as in the narrative.
    planned.push({
      index: PROCESS_INDEX,
      id: `${scenario.id}-${stage.id}-proc-${suffix}`,
      host,
      timestamp,
      decoy: isDecoy,
      document: {
        '@timestamp': timestamp,
        host: { name: host },
        process: {
          name: 'powershell.exe',
          parent: { name: 'outlook.exe' },
          command_line: 'powershell -enc SQBFAFgA',
          pid: 1234,
        },
        event: { category: 'process', type: ['start'] },
      },
    });

    // Network telemetry: the C2 beacon from the narrative.
    planned.push({
      index: NETWORK_INDEX,
      id: `${scenario.id}-${stage.id}-net-${suffix}`,
      host,
      timestamp,
      decoy: isDecoy,
      document: {
        '@timestamp': timestamp,
        host: { name: host },
        source: { ip: '10.0.0.1' },
        destination: { ip: '192.168.1.50', port: 443 },
        network: { protocol: 'tcp' },
        event: { category: 'network', type: ['connection'] },
      },
    });
  }

  return planned;
};

/**
 * Seed raw telemetry into logs-* so the corroboration worker has real ES|QL rows
 * to query.
 */
export const seedForensicTimeline = async (params: SeedParams): Promise<void> => {
  const { esClient, scenario } = params;
  const planned = planSeedEvents(scenario);
  if (planned.length === 0) return;

  const events: unknown[] = planned.flatMap((event) => [
    { index: { _index: event.index, _id: event.id } },
    event.document,
  ]);

  // `refresh: true` is required, not cosmetic: the worker queries these rows
  // through ES|QL seconds after seeding, and an unrefreshed bulk write is not
  // searchable yet.
  const response = await esClient.bulk({ operations: events, refresh: true });

  // The response used to be discarded, so a partial failure (a mapping
  // conflict, a rejected document, a read-only index) left the scenario seeded
  // with fewer events than the dataset expects and the eval scored the WORKER
  // for a gap the SEEDER created. Fail setup instead.
  if (response.errors) {
    const failed = response.items.find((item) => item.index?.error);
    const firstError = failed?.index?.error;
    throw new Error(
      `seedForensicTimeline: bulk index failed for scenario "${scenario.id}" ` +
        `(${planned.length} planned events): ${JSON.stringify(firstError ?? 'unknown error')}`
    );
  }
};

/**
 * Removes exactly what `seedForensicTimeline` wrote for one scenario.
 *
 * The delete used to fan out across `logs-*` with a bare `prefix: scenarioId`,
 * which on a shared eval stack could match another scenario whose id starts with
 * this one (`partial-gap` vs `partial-gap-extended`) and could reach unrelated
 * log indices — including restricted ones, where the whole teardown fails. Both
 * halves are scoped now: the two indices this seeder writes, and the id
 * delimiter that ends the scenario prefix.
 */
export const cleanupSeededData = async (esClient: Client, scenarioId: string): Promise<void> => {
  await esClient.deleteByQuery({
    index: [PROCESS_INDEX, NETWORK_INDEX],
    ignore_unavailable: true,
    query: {
      prefix: { _id: `${scenarioId}-` },
    },
  });
};
