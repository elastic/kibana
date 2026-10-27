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
import { EMPTY_ENTITY_FILTERS } from '../../../entities_grid/common';
import { buildEntityFilterClauses } from '../../../entities_grid/queries/entity_filters';
import { getRiskScoreIndex } from '../../../entities_grid/queries/esql';
import { buildNewlyHighCriticalCountQuery } from '../tile_newly_high_critical_query';
import { buildRiskHistoryReachesBackQuery } from '../risk_previous_period';
import { buildRiskMoversCountQuery } from '../tile_risk_movers_query';

/*
 * Entities whose risk tiles are known by construction for the 7d range. The risk history has a
 * score or level in the two hours before 14 days ago (the start of the previous period) and before
 * 7 days ago (its end, and the start of the current period). The entity docs hold the value now.
 * The last doc in each two-hour window counts; a doc more than two hours before it is ignored.
 *
 * Risk movers (score up by 10 or more):
 *
 * | entity.id  | 14d ago (old -> last) | 7d ago | now | previous? | current? | notes                          |
 * |------------|-----------------------|--------|-----|-----------|----------|--------------------------------|
 * | host:m1    | 40                    | 55     | 70  | +15 yes   | +15 yes  | high_impact                    |
 * | host:m5    | 40                    | 55     | 70  | yes       | yes      | resolves to host:m1, one entity |
 * | host:m2    | 50                    | 55     | 55  | +5 no     | 0 no     |                                |
 * | host:m3    | 30                    | 60     | 80  | +30 yes   | +20 yes  |                                |
 * | host:m4    | none                  | 90     | 90  | no        | no       | no earlier score               |
 * | host:m6    | 20                    | 35     | -   | yes       | -        | no entity doc, so dropped      |
 * | host:m7    | 70 -> 45 (last)       | 60     | 61  | +15 yes   | +1 no    | the last score counts, not 70  |
 * | host:m8    | 10 (3h before)        | 60     | 61  | no        | no       | its only old score is too old  |
 *
 * Newly high or critical (High or Critical, and higher than before or with no earlier level):
 *
 * | entity.id  | 14d ago (old -> last) | 7d ago   | now      | previous? | current? | notes                      |
 * |------------|-----------------------|----------|----------|-----------|----------|----------------------------|
 * | user:n1    | Moderate              | High     | Critical | yes       | yes      | high_impact                |
 * | user:n8    | none                  | High     | Critical | yes       | yes      | resolves to user:n1        |
 * | user:n2    | High                  | Critical | Critical | yes       | no       |                            |
 * | user:n3    | High                  | High     | High     | no        | no       |                            |
 * | user:n4    | none                  | High     | High     | yes       | no       | no earlier level counts    |
 * | user:n5    | Critical              | High     | High     | no        | no       | went down                  |
 * | user:n6    | Low                   | Moderate | High     | no        | yes      | not High at 7d ago         |
 * | user:n7    | Critical -> Low       | High     | High     | yes       | no       | the last level counts      |
 * | user:n9    | Low                   | High     | -        | yes       | -        | no entity doc, so dropped  |
 */

const NAMESPACE = 'default';
const ENTITY_INDEX = 'entities-latest-risk-period-test';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const RANGE_MS = 7 * DAY_MS;

const KEYWORD: MappingProperty = { type: 'keyword' };
const FLOAT: MappingProperty = { type: 'float' };
const DATE: MappingProperty = { type: 'date' };

type Level = 'Low' | 'Moderate' | 'High' | 'Critical';

/** A risk doc: value, and hours before the moment it belongs to. */
type ScoreDoc = [score: number, hoursBefore: number];
type LevelDoc = [level: Level, hoursBefore: number];

interface MoverSeed {
  id: string;
  now: number;
  start?: ScoreDoc[];
  end: ScoreDoc[];
  criticality?: string;
  resolvedTo?: string;
  noEntityDoc?: boolean;
  /** The group's own (resolution) score, on a main entity: its current value and its history. */
  group?: { now: number; start?: ScoreDoc[]; end: ScoreDoc[] };
}

interface NewlySeed {
  id: string;
  now: Level;
  start?: LevelDoc[];
  end: LevelDoc[];
  criticality?: string;
  resolvedTo?: string;
  noEntityDoc?: boolean;
  group?: { now: Level; start?: LevelDoc[]; end: LevelDoc[] };
}

const LAST = 0.5;
const OLD = 1.5;
const TOO_OLD = 3;

const MOVERS: readonly MoverSeed[] = [
  { id: 'host:m1', now: 70, start: [[40, LAST]], end: [[55, LAST]], criticality: 'high_impact' },
  { id: 'host:m5', now: 70, start: [[40, LAST]], end: [[55, LAST]], resolvedTo: 'host:m1' },
  { id: 'host:m2', now: 55, start: [[50, LAST]], end: [[55, LAST]] },
  { id: 'host:m3', now: 80, start: [[30, LAST]], end: [[60, LAST]] },
  { id: 'host:m4', now: 90, end: [[90, LAST]] },
  { id: 'host:m6', now: 0, start: [[20, LAST]], end: [[35, LAST]], noEntityDoc: true },
  {
    id: 'host:m7',
    now: 61,
    start: [
      [70, OLD],
      [45, LAST],
    ],
    end: [[60, LAST]],
  },
  { id: 'host:m8', now: 61, start: [[10, TOO_OLD]], end: [[60, LAST]] },
  // Groups are judged by their own score, not by the scores of their members.
  // g1: its own score is flat, but the group's rose by 20 in the previous period.
  {
    id: 'host:g1',
    now: 30,
    start: [[30, LAST]],
    end: [[30, LAST]],
    group: { now: 65, start: [[40, LAST]], end: [[60, LAST]] },
  },
  { id: 'host:g1a', now: 60, start: [[10, LAST]], end: [[50, LAST]], resolvedTo: 'host:g1' },
  // g2: the group is flat; only its alias rose, which must not count.
  {
    id: 'host:g2',
    now: 30,
    start: [[30, LAST]],
    end: [[30, LAST]],
    group: { now: 55, start: [[50, LAST]], end: [[52, LAST]] },
  },
  { id: 'host:g2a', now: 70, start: [[10, LAST]], end: [[50, LAST]], resolvedTo: 'host:g2' },
  // g4: like g1, but its group docs are older than its own docs in each window. The group's value
  // still counts: it rose by 20 in the previous period, and by 2 (not its own 32) in the current one.
  {
    id: 'host:g4',
    now: 30,
    start: [[30, LAST]],
    end: [[30, LAST]],
    group: { now: 62, start: [[40, OLD]], end: [[60, OLD]] },
  },
];

const NEWLY: readonly NewlySeed[] = [
  {
    id: 'user:n1',
    now: 'Critical',
    start: [['Moderate', LAST]],
    end: [['High', LAST]],
    criticality: 'high_impact',
  },
  { id: 'user:n8', now: 'Critical', end: [['High', LAST]], resolvedTo: 'user:n1' },
  { id: 'user:n2', now: 'Critical', start: [['High', LAST]], end: [['Critical', LAST]] },
  { id: 'user:n3', now: 'High', start: [['High', LAST]], end: [['High', LAST]] },
  { id: 'user:n4', now: 'High', end: [['High', LAST]] },
  { id: 'user:n5', now: 'High', start: [['Critical', LAST]], end: [['High', LAST]] },
  { id: 'user:n6', now: 'High', start: [['Low', LAST]], end: [['Moderate', LAST]] },
  {
    id: 'user:n7',
    now: 'High',
    start: [
      ['Critical', OLD],
      ['Low', LAST],
    ],
    end: [['High', LAST]],
  },
  { id: 'user:n9', now: 'Low', start: [['Low', LAST]], end: [['High', LAST]], noEntityDoc: true },
  // g3: its own level stays Low, but the group went from Moderate to High in the previous period. Its
  // alias is High now, which must not count the group as newly high in the current period.
  {
    id: 'user:g3',
    now: 'Low',
    start: [['Low', LAST]],
    end: [['Low', LAST]],
    group: { now: 'High', start: [['Moderate', LAST]], end: [['High', LAST]] },
  },
  {
    id: 'user:g3a',
    now: 'High',
    start: [['Low', LAST]],
    end: [['Low', LAST]],
    resolvedTo: 'user:g3',
  },
  // g4: like g3, but its group docs are older than its own docs in each window. The group's level
  // still counts: Moderate to High in the previous period, and High to High (not Low to High) now.
  {
    id: 'user:g4',
    now: 'Low',
    start: [['Low', LAST]],
    end: [['Low', LAST]],
    group: { now: 'High', start: [['Moderate', OLD]], end: [['High', OLD]] },
  },
];

const iso = (ms: number) => new Date(ms).toISOString();
const typeOf = (id: string) => id.split(':')[0];

const riskDoc = (
  id: string,
  at: number,
  hoursBefore: number,
  value: { score?: number; level?: Level },
  scoreType?: 'base' | 'resolution'
) => ({
  '@timestamp': iso(at - hoursBefore * HOUR_MS),
  [`${typeOf(id)}.risk.id_field`]: 'entity.id',
  [`${typeOf(id)}.risk.id_value`]: id,
  ...(value.score === undefined
    ? {}
    : { [`${typeOf(id)}.risk.calculated_score_norm`]: value.score }),
  ...(value.level === undefined ? {} : { [`${typeOf(id)}.risk.calculated_level`]: value.level }),
  ...(scoreType ? { [`${typeOf(id)}.risk.score_type`]: scoreType } : {}),
});

const loadFixture = async (client: Client, withStartHistory: boolean) => {
  const now = Date.now();
  const startAt = now - 2 * RANGE_MS;
  const endAt = now - RANGE_MS;
  await client.indices.create({
    index: ENTITY_INDEX,
    settings: { index: { mode: 'lookup' } },
    mappings: {
      properties: {
        '@timestamp': DATE,
        'entity.id': KEYWORD,
        'entity.name': KEYWORD,
        'entity.risk.calculated_score_norm': FLOAT,
        'entity.risk.calculated_level': KEYWORD,
        'entity.relationships.resolution.resolved_to': KEYWORD,
        'entity.relationships.resolution.risk.calculated_score_norm': FLOAT,
        'entity.relationships.resolution.risk.calculated_level': KEYWORD,
        'asset.criticality': KEYWORD,
      },
    },
  });
  await client.indices.create({
    index: getRiskScoreIndex(NAMESPACE),
    mappings: {
      properties: {
        '@timestamp': DATE,
        ...Object.fromEntries(
          ['host', 'user', 'service'].flatMap((type): Array<[string, MappingProperty]> => [
            [`${type}.risk.id_field`, KEYWORD],
            [`${type}.risk.id_value`, KEYWORD],
            [`${type}.risk.calculated_score_norm`, FLOAT],
            [`${type}.risk.calculated_level`, KEYWORD],
            [`${type}.risk.score_type`, KEYWORD],
          ])
        ),
      },
    },
  });
  const operations: object[] = [];
  const entity = (doc: object) => operations.push({ index: { _index: ENTITY_INDEX } }, doc);
  const risk = (doc: object) =>
    operations.push({ index: { _index: getRiskScoreIndex(NAMESPACE) } }, doc);
  MOVERS.forEach(
    ({ id, now: score, start = [], end, criticality, resolvedTo, noEntityDoc, group }) => {
      if (!noEntityDoc) {
        entity({
          '@timestamp': iso(now),
          'entity.id': id,
          'entity.name': id.split(':')[1],
          'entity.risk.calculated_score_norm': score,
          ...(group
            ? { 'entity.relationships.resolution.risk.calculated_score_norm': group.now }
            : {}),
          ...(criticality ? { 'asset.criticality': criticality } : {}),
          ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
        });
      }
      const ownType = group ? 'base' : undefined;
      if (withStartHistory) {
        start.forEach(([s, h]) => risk(riskDoc(id, startAt, h, { score: s }, ownType)));
        group?.start?.forEach(([s, h]) =>
          risk(riskDoc(id, startAt, h, { score: s }, 'resolution'))
        );
      }
      end.forEach(([s, h]) => risk(riskDoc(id, endAt, h, { score: s }, ownType)));
      group?.end.forEach(([s, h]) => risk(riskDoc(id, endAt, h, { score: s }, 'resolution')));
    }
  );
  NEWLY.forEach(
    ({ id, now: level, start = [], end, criticality, resolvedTo, noEntityDoc, group }) => {
      if (!noEntityDoc) {
        entity({
          '@timestamp': iso(now),
          'entity.id': id,
          'entity.name': id.split(':')[1],
          'entity.risk.calculated_level': level,
          ...(group ? { 'entity.relationships.resolution.risk.calculated_level': group.now } : {}),
          ...(criticality ? { 'asset.criticality': criticality } : {}),
          ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
        });
      }
      const ownType = group ? 'base' : undefined;
      if (withStartHistory) {
        start.forEach(([l, h]) => risk(riskDoc(id, startAt, h, { level: l }, ownType)));
        group?.start?.forEach(([l, h]) =>
          risk(riskDoc(id, startAt, h, { level: l }, 'resolution'))
        );
      }
      end.forEach(([l, h]) => risk(riskDoc(id, endAt, h, { level: l }, ownType)));
      group?.end.forEach(([l, h]) => risk(riskDoc(id, endAt, h, { level: l }, 'resolution')));
    }
  );
  const response = await client.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) throw new Error('Bulk indexing of the risk period fixture failed');
};

const HIGH_IMPACT_ONLY = buildEntityFilterClauses({
  ...EMPTY_ENTITY_FILTERS,
  assetCriticality: ['high_impact'],
});

const startCluster = async () => {
  const esServer = createTestEsCluster({
    log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
  });
  await esServer.start();
  return { esServer, client: esServer.getClient() as Client };
};

/** The previous period returns only the count; this adds the ids back to check WHICH entities counted. */
const withEntityIds = (query: string) =>
  query.replace(
    '| STATS value = COUNT(effective_id)',
    '| STATS value = COUNT(effective_id), entity_ids = VALUES(effective_id)'
  );

const runTile = async (client: Client, query: string) => {
  const { columns, values } = await client.esql.query({ query });
  const row = Object.fromEntries(columns.map(({ name }, i) => [name, values[0]?.[i]]));
  return { count: Number(row.value), ids: [row.entity_ids ?? []].flat().map(String).sort() };
};

describe('risk tiles for both periods on Elasticsearch', () => {
  let esServer: Awaited<ReturnType<typeof startCluster>>['esServer'];
  let client: Client;

  beforeAll(async () => {
    ({ esServer, client } = await startCluster());
    await loadFixture(client, true);
  }, 300_000);

  afterAll(async () => {
    await esServer?.stop();
  });

  const movers = (period: 'current' | 'previous', filters: string[] = []) => {
    const query = buildRiskMoversCountQuery(NAMESPACE, ENTITY_INDEX, '7d', filters, period);
    return runTile(client, period === 'previous' ? withEntityIds(query) : query);
  };
  const newly = (period: 'current' | 'previous', filters: string[] = []) => {
    const query = buildNewlyHighCriticalCountQuery(NAMESPACE, ENTITY_INDEX, '7d', filters, period);
    return runTile(client, period === 'previous' ? withEntityIds(query) : query);
  };

  it.each([
    ['risk movers', buildRiskMoversCountQuery],
    ['newly high/critical', buildNewlyHighCriticalCountQuery],
  ] as const)('returns only the count for the previous period of %s', async (_name, build) => {
    const { columns } = await client.esql.query({
      query: build(NAMESPACE, ENTITY_INDEX, '7d', [], 'previous'),
    });
    expect(columns.map(({ name }) => name)).toEqual(['value']);
  });

  describe('risk movers', () => {
    it('counts the previous period from the history at its start and its end', async () => {
      // host:g1 and host:g4 count through their group's rise; host:g2 does not, only its alias rose.
      expect(await movers('previous')).toEqual({
        count: 5,
        ids: ['host:g1', 'host:g4', 'host:m1', 'host:m3', 'host:m7'],
      });
    });

    it('keeps the current period as the tile has always counted it', async () => {
      expect(await movers('current')).toEqual({ count: 2, ids: ['host:m1', 'host:m3'] });
    });

    it('gives the delta as the current count minus the previous count', async () => {
      expect((await movers('current')).count - (await movers('previous')).count).toBe(-3);
    });

    it('keeps only the entities the filters keep in the previous period', async () => {
      expect(await movers('previous', HIGH_IMPACT_ONLY)).toEqual({
        count: 1,
        ids: ['host:m1'],
      });
    });
  });

  describe('newly high/critical', () => {
    it('counts the previous period from the history at its start and its end', async () => {
      // user:g3 and user:g4 count through their group's level, which their own Low level hides.
      expect(await newly('previous')).toEqual({
        count: 6,
        ids: ['user:g3', 'user:g4', 'user:n1', 'user:n2', 'user:n4', 'user:n7'],
      });
    });

    it('keeps the current period as the tile has always counted it', async () => {
      expect(await newly('current')).toEqual({ count: 2, ids: ['user:n1', 'user:n6'] });
    });

    it('gives the delta as the current count minus the previous count', async () => {
      expect((await newly('current')).count - (await newly('previous')).count).toBe(-4);
    });

    it('keeps only the entities the filters keep in the previous period', async () => {
      expect(await newly('previous', HIGH_IMPACT_ONLY)).toEqual({
        count: 1,
        ids: ['user:n1'],
      });
    });
  });

  it('finds the risk history at the start and the end of the previous period', async () => {
    const { values } = await client.esql.query({
      query: buildRiskHistoryReachesBackQuery(NAMESPACE, '7d'),
    });
    expect(values[0][0]).toBe(true);
  });
});

describe('risk tiles when the history does not reach back two ranges', () => {
  let esServer: Awaited<ReturnType<typeof startCluster>>['esServer'];
  let client: Client;

  beforeAll(async () => {
    ({ esServer, client } = await startCluster());
    await loadFixture(client, false);
  }, 300_000);

  afterAll(async () => {
    await esServer?.stop();
  });

  it('finds no risk history at the start of the previous period', async () => {
    const { values } = await client.esql.query({
      query: buildRiskHistoryReachesBackQuery(NAMESPACE, '7d'),
    });
    expect(values[0][0]).toBe(false);
  });
});
