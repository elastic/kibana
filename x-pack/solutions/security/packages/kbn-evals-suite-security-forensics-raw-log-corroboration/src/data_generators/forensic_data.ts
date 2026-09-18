/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorroborationScenario, NarrativeStage } from '../types';

interface SeedParams {
  esClient: { bulk: (params: { index: string; body: unknown[] }) => Promise<unknown> };
  scenario: CorroborationScenario;
}

const OUT_OF_SCOPE_OFFSET_MS = 24 * 60 * 60 * 1000;

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

const hostFor = (scenario: CorroborationScenario, stage: NarrativeStage): string =>
  stage.decoy?.host ?? scenario.scope.hosts[0];

/**
 * Seed raw telemetry into logs-* so the corroboration worker has real ES|QL rows
 * to query.
 *
 * Seeding is driven by `scenario.stages`: a corroborated stage gets in-scope
 * telemetry, a `decoy` stage gets telemetry that is deliberately out of scope,
 * and every other stage gets none. Previously the same two events were written
 * for every scenario, so scenarios whose premise is "no telemetry" or "a gap
 * here" were run against data that contradicted them.
 */
export const seedForensicTimeline = async (params: SeedParams): Promise<void> => {
  const { esClient, scenario } = params;
  const events: unknown[] = [];

  const seededStages = scenario.stages.filter(
    (stage) => stage.corroborated || stage.decoy !== undefined
  );

  for (const stage of seededStages) {
    const host = hostFor(scenario, stage);
    const timestamp = timestampFor(scenario, stage);
    const suffix = stage.decoy === undefined ? 'in-scope' : 'decoy';

    // Process telemetry: powershell spawned by outlook, as in the narrative.
    events.push(
      {
        index: {
          _index: 'logs-endpoint.events.process-default',
          _id: `${scenario.id}-${stage.id}-proc-${suffix}`,
        },
      },
      {
        '@timestamp': timestamp,
        host: { name: host },
        process: {
          name: 'powershell.exe',
          parent: { name: 'outlook.exe' },
          command_line: 'powershell -enc SQBFAFgA',
          pid: 1234,
        },
        event: { category: 'process', type: ['start'] },
      }
    );

    // Network telemetry: the C2 beacon from the narrative.
    events.push(
      {
        index: {
          _index: 'logs-endpoint.events.network-default',
          _id: `${scenario.id}-${stage.id}-net-${suffix}`,
        },
      },
      {
        '@timestamp': timestamp,
        host: { name: host },
        source: { ip: '10.0.0.1' },
        destination: { ip: '192.168.1.50', port: 443 },
        network: { protocol: 'tcp' },
        event: { category: 'network', type: ['connection'] },
      }
    );
  }

  if (events.length === 0) return;

  await esClient.bulk({ index: 'logs-*', body: events });
};

export const cleanupSeededData = async (
  esClient: { deleteByQuery: (params: { index: string; body: unknown }) => Promise<unknown> },
  scenarioId: string
): Promise<void> => {
  await esClient.deleteByQuery({
    index: 'logs-*',
    body: {
      query: {
        prefix: { _id: scenarioId },
      },
    },
  });
};
