/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { getRiskScoreIndex } from '../../../entities_grid/queries/esql';

/*
 * Entities and risk scores whose risk tile results are known by construction. Risk score
 * docs sit around the 30 day boundary: "in the window" is 30 and 31 hours before it, 30 days
 * ago (`[NOW() - 30d - 2h, NOW() - 30d]`); "before the window" is 3 hours earlier, so ignored.
 *
 * Risk movers (current score minus the last boundary score is 10 or more):
 *
 * | entity.id    | boundary scores (old → last) | current | moved? | notes                         |
 * |--------------|------------------------------|---------|--------|-------------------------------|
 * | host:rise    | 40                           | 60      | yes    | high_impact                   |
 * | host:exact   | 50                           | 60      | yes    | exactly 10                    |
 * | host:small   | 50                           | 55      | no     |                               |
 * | host:drop    | 80                           | 40      | no     |                               |
 * | host:new     | –                            | 90      | no     | no boundary score             |
 * | host:stale   | 10, before the window        | 90      | no     | its only score is too old     |
 * | host:last    | 10 → 70                      | 75      | no     | the last score counts, not 10 |
 * | host:alias   | 20                           | 50      | yes    | resolves to host:rise         |
 *
 * Newly high or critical (High or Critical now, and higher than the last boundary level):
 *
 * | entity.id          | boundary levels (old → last) | current  | newly? | notes                       |
 * |--------------------|------------------------------|----------|--------|-----------------------------|
 * | user:new-high      | –                            | High     | yes    | no boundary level           |
 * | user:up            | Moderate                     | Critical | yes    | high_impact                 |
 * | user:high-to-crit  | High                         | Critical | yes    |                             |
 * | user:still-high    | High                         | High     | no     |                             |
 * | user:was-crit      | Critical                     | High     | no     | went down                   |
 * | user:last-low      | Critical → Low               | High     | yes    | the last level counts       |
 * | user:moderate-now  | Low                          | Moderate | no     | not High or Critical        |
 * | user:alias         | –                            | High     | yes    | resolves to user:up         |
 *
 * The host entities stay Low or Moderate, so none is newly high or critical, and every user
 * keeps its boundary score as its current score, so none is a risk mover.
 */

export const NAMESPACE = 'default';
export const ENTITY_INDEX = 'entities-latest-tiles-test';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const BOUNDARY_MS = 30 * DAY_MS;

const KEYWORD: MappingProperty = { type: 'keyword' };
const FLOAT: MappingProperty = { type: 'float' };
const DATE: MappingProperty = { type: 'date' };

type Level = 'Low' | 'Moderate' | 'High' | 'Critical';

interface EntitySeed {
  id: string;
  score: number;
  level: Level;
  /** Boundary docs, oldest first: score, level and hours before the 30 day boundary. */
  boundary?: ReadonlyArray<[score: number, level: Level, hoursBefore: number]>;
  criticality?: string;
  resolvedTo?: string;
}

const IN_WINDOW_OLD = 1.5;
const IN_WINDOW_LAST = 0.5;
const BEFORE_WINDOW = 3;

const ENTITIES: readonly EntitySeed[] = [
  // Risk movers
  {
    id: 'host:rise',
    score: 60,
    level: 'Moderate',
    boundary: [[40, 'Moderate', IN_WINDOW_LAST]],
    criticality: 'high_impact',
  },
  { id: 'host:exact', score: 60, level: 'Moderate', boundary: [[50, 'Moderate', IN_WINDOW_LAST]] },
  { id: 'host:small', score: 55, level: 'Moderate', boundary: [[50, 'Moderate', IN_WINDOW_LAST]] },
  { id: 'host:drop', score: 40, level: 'Moderate', boundary: [[80, 'Moderate', IN_WINDOW_LAST]] },
  { id: 'host:new', score: 90, level: 'Moderate' },
  { id: 'host:stale', score: 90, level: 'Moderate', boundary: [[10, 'Low', BEFORE_WINDOW]] },
  {
    id: 'host:last',
    score: 75,
    level: 'Moderate',
    boundary: [
      [10, 'Low', IN_WINDOW_OLD],
      [70, 'Moderate', IN_WINDOW_LAST],
    ],
  },
  {
    id: 'host:alias',
    score: 50,
    level: 'Low',
    boundary: [[20, 'Low', IN_WINDOW_LAST]],
    resolvedTo: 'host:rise',
  },
  // Newly high or critical
  { id: 'user:new-high', score: 75, level: 'High' },
  {
    id: 'user:up',
    score: 95,
    level: 'Critical',
    boundary: [[95, 'Moderate', IN_WINDOW_LAST]],
    criticality: 'high_impact',
  },
  {
    id: 'user:high-to-crit',
    score: 92,
    level: 'Critical',
    boundary: [[92, 'High', IN_WINDOW_LAST]],
  },
  { id: 'user:still-high', score: 75, level: 'High', boundary: [[75, 'High', IN_WINDOW_LAST]] },
  { id: 'user:was-crit', score: 75, level: 'High', boundary: [[75, 'Critical', IN_WINDOW_LAST]] },
  {
    id: 'user:last-low',
    score: 75,
    level: 'High',
    boundary: [
      [75, 'Critical', IN_WINDOW_OLD],
      [75, 'Low', IN_WINDOW_LAST],
    ],
  },
  {
    id: 'user:moderate-now',
    score: 50,
    level: 'Moderate',
    boundary: [[50, 'Low', IN_WINDOW_LAST]],
  },
  { id: 'user:alias', score: 75, level: 'High', resolvedTo: 'user:up' },
];

const RISK_TYPES = ['host', 'user', 'service'] as const;

const toIsoAgo = (now: number, ms: number) => new Date(now - ms).toISOString();

const toEntityDoc = ({ id, score, level, criticality, resolvedTo }: EntitySeed, now: number) => ({
  '@timestamp': toIsoAgo(now, HOUR_MS),
  'entity.id': id,
  'entity.name': id.split(':')[1],
  'entity.EngineMetadata.Type': id.split(':')[0],
  'entity.risk.calculated_score_norm': score,
  'entity.risk.calculated_level': level,
  ...(criticality ? { 'asset.criticality': criticality } : {}),
  ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
});

const toRiskDocs = ({ id, boundary = [] }: EntitySeed, now: number) => {
  const type = id.split(':')[0];
  return boundary.map(([score, level, hoursBefore]) => ({
    '@timestamp': toIsoAgo(now, BOUNDARY_MS + hoursBefore * HOUR_MS),
    [`${type}.risk.id_field`]: 'entity.id',
    [`${type}.risk.id_value`]: id,
    [`${type}.risk.calculated_score_norm`]: score,
    [`${type}.risk.calculated_level`]: level,
  }));
};

interface FixtureIndex {
  index: string;
  settings?: Record<string, unknown>;
  fields: Record<string, MappingProperty>;
  buildDocs: (now: number) => Array<Record<string, unknown>>;
}

const FIXTURE_INDICES: readonly FixtureIndex[] = [
  {
    // In lookup mode, so the newly high or critical query can LOOKUP JOIN it.
    index: ENTITY_INDEX,
    settings: { index: { mode: 'lookup' } },
    fields: {
      '@timestamp': DATE,
      'entity.id': KEYWORD,
      'entity.name': KEYWORD,
      'entity.EngineMetadata.Type': KEYWORD,
      'entity.risk.calculated_score_norm': FLOAT,
      'entity.risk.calculated_level': KEYWORD,
      'entity.relationships.resolution.resolved_to': KEYWORD,
      'asset.criticality': KEYWORD,
    },
    buildDocs: (now) => ENTITIES.map((seed) => toEntityDoc(seed, now)),
  },
  {
    index: getRiskScoreIndex(NAMESPACE),
    fields: {
      '@timestamp': DATE,
      ...Object.fromEntries(
        RISK_TYPES.flatMap(
          (type): Array<[string, MappingProperty]> => [
            [`${type}.risk.id_field`, KEYWORD],
            [`${type}.risk.id_value`, KEYWORD],
            [`${type}.risk.calculated_score_norm`, FLOAT],
            [`${type}.risk.calculated_level`, KEYWORD],
          ]
        )
      ),
    },
    buildDocs: (now) => ENTITIES.flatMap((seed) => toRiskDocs(seed, now)),
  },
];

const loadIndex = async (client: Client, { index, settings, fields, buildDocs }: FixtureIndex) => {
  await client.indices.create({ index, settings, mappings: { properties: fields } });
  const operations = buildDocs(Date.now()).flatMap((doc) => [{ index: { _index: index } }, doc]);
  if (!operations.length) return;
  const response = await client.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) throw new Error(`Bulk indexing into ${index} failed`);
};

/** The single row of a tile query: its count and the ids it filters the grid to. */
export interface TileResult {
  value: number;
  entityIds: string[];
}

export interface TilesCluster {
  runTileQuery: (query: string) => Promise<TileResult>;
  stop: () => Promise<void>;
}

/** Starts a test Elasticsearch with the fixture loaded. */
export const startTilesCluster = async (): Promise<TilesCluster> => {
  const esServer = createTestEsCluster({
    log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
  });
  await esServer.start();
  const client = esServer.getClient();
  await Promise.all(FIXTURE_INDICES.map((fixtureIndex) => loadIndex(client, fixtureIndex)));
  const runTileQuery = async (query: string): Promise<TileResult> => {
    const { columns, values } = await client.esql.query({ query });
    const row = Object.fromEntries(columns.map(({ name }, i) => [name, values[0]?.[i]]));
    return {
      value: Number(row.value ?? 0),
      entityIds: [row.entity_ids ?? []].flat().map(String).sort(),
    };
  };
  return { runTileQuery, stop: () => esServer.stop() };
};
