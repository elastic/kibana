/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { TimeRange } from '../../../entities_grid/common';
import { getRiskScoreIndex } from '../../../entities_grid/queries/esql';
import {
  RISK_MOVER_MIN_SCORE_CHANGE,
  buildRiskLevelHistoryBranch,
  buildRiskScoreHistoryBranch,
} from '../risk_history';
import { buildJoinTail } from '../risk_previous_period';
import {
  buildRiskTilesSeriesQuery,
  newlyHighCriticalSeriesColumn,
  riskMoversSeriesColumn,
} from '../risk_series_query';
import { buildNewlyHighCriticalCountQuery } from '../tile_newly_high_critical_query';
import { buildRiskMoversCountQuery } from '../tile_risk_movers_query';
import { TIME_RANGE_DAYS } from '../tile_period';
import { getSeriesWindow, readSeriesDots } from '../tile_series_window';
import { describeSeriesFollowsCount, readCounts, RANGES } from './series_follow_count_suite';

/*
 * The risk tile sparkline dots must follow the tile counts. Dot k is the tile as it stood k steps
 * ago: the value then against the value one range earlier, both from the risk score history. The
 * oracle runs the same two history branches the shipped queries use, merged by entity, with the
 * moment moved back k steps, once per dot.
 *
 * Every entity has an hourly risk doc, half an hour off a whole hour, from `from` hours ago to now.
 * Its score and level change at the hours listed ("at 100: 75 High" holds from 100 hours ago on).
 * The entity docs hold the value now, which is what the tile count reads.
 *
 * | entity.id | history from | value over time (hours ago)                                         |
 * |-----------|--------------|---------------------------------------------------------------------|
 * | host:r1   | 1500         | 40 Low, at 400: 60 Moderate, at 100: 75 High, at 20: 90 Critical     |
 * | host:r5   | 1500         | like r1 but starts at 35 Low; resolves to host:r1, so one entity     |
 * | host:r2   | 1500         | 50 Moderate throughout                                              |
 * | user:r3   | 1500         | 30 Low, at 1000: 45 Moderate, at 200: 70 High, at 50: 72 High        |
 * | host:r4   | 25           | 50 Moderate, at 10: 88 Critical; nothing earlier than 25 hours ago   |
 * | host:r6   | 1500         | 10 Low, at 5: 80 High; no entity doc, so dropped                    |
 * | user:r7   | 1500         | 75 High, at 600: 40 Low, at 90: 78 High                             |
 * | host:r8   | 1500         | 20 Low, at 1300: 55 Moderate, at 40: 95 Critical                    |
 * | host:g1   | 1500         | own 30 Low throughout; group 40 Low, at 100: 70 High (the group counts) |
 * | host:g1a  | 1500         | alias of host:g1: own 20 Low, at 140: 80 Critical (must not count, even where the group does not rise) |
 * | host:g4   | 1500         | like host:g1, but each group doc is older than the own doc of its hour (the group still counts) |
 */

const NAMESPACE = 'default';
const ENTITY_INDEX = 'entities-latest-risk-series-test';
const HOUR_MS = 60 * 60 * 1000;
const HISTORY_HOURS = 1500;

const KEYWORD: MappingProperty = { type: 'keyword' };
const FLOAT: MappingProperty = { type: 'float' };
const DATE: MappingProperty = { type: 'date' };

type Level = 'Low' | 'Moderate' | 'High' | 'Critical';
type Value = [score: number, level: Level];
/** From `hoursAgo` hours ago on, the entity has this value. */
type Change = [hoursAgo: number, value: Value];

interface EntitySeed {
  id: string;
  from: number;
  initial: Value;
  changes: Change[];
  resolvedTo?: string;
  noEntityDoc?: boolean;
  /** The group's own (resolution) value, on a main entity: its history, hour by hour. */
  group?: { initial: Value; changes: Change[]; hoursOlder?: number };
}

const R1_CHANGES: Change[] = [
  [400, [60, 'Moderate']],
  [100, [75, 'High']],
  [20, [90, 'Critical']],
];

const ENTITIES: readonly EntitySeed[] = [
  { id: 'host:r1', from: HISTORY_HOURS, initial: [40, 'Low'], changes: R1_CHANGES },
  {
    id: 'host:r5',
    from: HISTORY_HOURS,
    initial: [35, 'Low'],
    changes: R1_CHANGES,
    resolvedTo: 'host:r1',
  },
  { id: 'host:r2', from: HISTORY_HOURS, initial: [50, 'Moderate'], changes: [] },
  {
    id: 'user:r3',
    from: HISTORY_HOURS,
    initial: [30, 'Low'],
    changes: [
      [1000, [45, 'Moderate']],
      [200, [70, 'High']],
      [50, [72, 'High']],
    ],
  },
  { id: 'host:r4', from: 25, initial: [50, 'Moderate'], changes: [[10, [88, 'Critical']]] },
  {
    id: 'host:r6',
    from: HISTORY_HOURS,
    initial: [10, 'Low'],
    changes: [[5, [80, 'High']]],
    noEntityDoc: true,
  },
  {
    id: 'user:r7',
    from: HISTORY_HOURS,
    initial: [75, 'High'],
    changes: [
      [600, [40, 'Low']],
      [90, [78, 'High']],
    ],
  },
  {
    id: 'host:r8',
    from: HISTORY_HOURS,
    initial: [20, 'Low'],
    changes: [
      [1300, [55, 'Moderate']],
      [40, [95, 'Critical']],
    ],
  },
  {
    id: 'host:g1',
    from: HISTORY_HOURS,
    initial: [30, 'Low'],
    changes: [],
    group: { initial: [40, 'Low'], changes: [[100, [70, 'High']]] },
  },
  {
    id: 'host:g1a',
    from: HISTORY_HOURS,
    initial: [20, 'Low'],
    changes: [[140, [80, 'Critical']]],
    resolvedTo: 'host:g1',
  },
  {
    id: 'host:g4',
    from: HISTORY_HOURS,
    initial: [30, 'Low'],
    changes: [],
    group: { initial: [40, 'Low'], changes: [[100, [70, 'High']]], hoursOlder: 0.3 },
  },
];

const valueAt = ({ initial, changes }: EntitySeed, hoursAgo: number): Value =>
  changes.reduce<Value>((value, [from, next]) => (hoursAgo <= from ? next : value), initial);

const typeOf = (id: string) => id.split(':')[0];

const loadFixture = async (client: Client) => {
  await client.indices.create({
    index: ENTITY_INDEX,
    settings: { index: { mode: 'lookup' } },
    mappings: {
      properties: {
        'entity.id': KEYWORD,
        'entity.name': KEYWORD,
        'entity.risk.calculated_score_norm': FLOAT,
        'entity.risk.calculated_level': KEYWORD,
        'entity.relationships.resolution.resolved_to': KEYWORD,
        'entity.relationships.resolution.risk.calculated_score_norm': FLOAT,
        'entity.relationships.resolution.risk.calculated_level': KEYWORD,
      },
    },
  });
  await client.indices.create({
    index: getRiskScoreIndex(NAMESPACE),
    mappings: {
      properties: {
        '@timestamp': DATE,
        'host.risk.id_value': KEYWORD,
        'host.risk.calculated_score_norm': FLOAT,
        'host.risk.calculated_level': KEYWORD,
        'host.risk.score_type': KEYWORD,
        'user.risk.id_value': KEYWORD,
        'user.risk.calculated_score_norm': FLOAT,
        'user.risk.calculated_level': KEYWORD,
        'user.risk.score_type': KEYWORD,
      },
    },
  });
  const now = Date.now();
  const operations = ENTITIES.flatMap((seed) => {
    const type = typeOf(seed.id);
    const [score, level] = valueAt(seed, 0);
    const entityDoc = seed.noEntityDoc
      ? []
      : [
          { index: { _index: ENTITY_INDEX } },
          {
            'entity.id': seed.id,
            'entity.name': seed.id.split(':')[1],
            'entity.risk.calculated_score_norm': score,
            'entity.risk.calculated_level': level,
            ...(seed.group
              ? {
                  'entity.relationships.resolution.risk.calculated_score_norm': valueAt(
                    { ...seed, ...seed.group },
                    0
                  )[0],
                  'entity.relationships.resolution.risk.calculated_level': valueAt(
                    { ...seed, ...seed.group },
                    0
                  )[1],
                }
              : {}),
            ...(seed.resolvedTo
              ? { 'entity.relationships.resolution.resolved_to': seed.resolvedTo }
              : {}),
          },
        ];
    const history = Array.from({ length: seed.from + 1 }, (_, h) => {
      const [docScore, docLevel] = valueAt(seed, h);
      const doc = (value: Value, scoreType?: 'base' | 'resolution', hoursOlder = 0) => [
        { index: { _index: getRiskScoreIndex(NAMESPACE) } },
        {
          '@timestamp': new Date(now - (h + 0.5 + hoursOlder) * HOUR_MS).toISOString(),
          [`${type}.risk.id_value`]: seed.id,
          [`${type}.risk.calculated_score_norm`]: value[0],
          [`${type}.risk.calculated_level`]: value[1],
          ...(scoreType ? { [`${type}.risk.score_type`]: scoreType } : {}),
        },
      ];
      // A main entity has its own (base) docs and its group's (resolution) docs, under one id.
      return seed.group
        ? [
            ...doc([docScore, docLevel], 'base'),
            ...doc(valueAt({ ...seed, ...seed.group }, h), 'resolution', seed.group.hoursOlder),
          ]
        : doc([docScore, docLevel]);
    }).flat();
    return [...entityDoc, ...history];
  });
  const response = await client.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) throw new Error('Bulk indexing of the risk series fixture failed');
};

const hoursBack = (hours: number) => (hours === 0 ? 'NOW()' : `NOW() - ${hours} hours`);

/** The risk tile as it stood `back` hours ago, from the two history branches the tiles use. */
const oracleMovers = (range: TimeRange, back: number) => {
  const index = getRiskScoreIndex(NAMESPACE);
  const rangeHours = TIME_RANGE_DAYS[range] * 24;
  return [
    `SET unmapped_fields="nullify";`,
    'FROM (',
    ...buildRiskScoreHistoryBranch(index, hoursBack(back + rangeHours), 'boundary_score'),
    '), (',
    ...buildRiskScoreHistoryBranch(index, hoursBack(back), 'current_score'),
    ')',
    `| STATS boundary_score = MAX(boundary_score), current_score = MAX(current_score) BY \`entity.id\``,
    `| WHERE current_score - boundary_score >= ${RISK_MOVER_MIN_SCORE_CHANGE}`,
    ...buildJoinTail(ENTITY_INDEX, []),
  ].join('\n');
};

const oracleNewlyHighCritical = (range: TimeRange, back: number) => {
  const index = getRiskScoreIndex(NAMESPACE);
  const rangeHours = TIME_RANGE_DAYS[range] * 24;
  return [
    `SET unmapped_fields="nullify";`,
    'FROM (',
    ...buildRiskLevelHistoryBranch(index, hoursBack(back + rangeHours), 'boundary_level_num'),
    '), (',
    ...buildRiskLevelHistoryBranch(index, hoursBack(back), 'current_level_num'),
    '  | WHERE current_level_num >= 3',
    ')',
    `| STATS boundary_level_num = MAX(boundary_level_num), current_level_num = MAX(current_level_num) BY \`entity.id\``,
    `| WHERE current_level_num >= 3 AND (boundary_level_num IS NULL OR current_level_num > boundary_level_num)`,
    ...buildJoinTail(ENTITY_INDEX, []),
  ].join('\n');
};

const COLUMNS = ['value'];

describeSeriesFollowsCount({
  name: 'risk tile series',
  loadFixture,
  setupTimeoutMs: 600_000,
  tiles: [
    {
      name: 'Risk movers',
      column: riskMoversSeriesColumn,
      byHand: { '24h': 2, '30d': 5 },
    },
    {
      name: 'Newly high/critical',
      column: newlyHighCriticalSeriesColumn,
      byHand: { '24h': 2, '30d': 6 },
    },
  ],
  // The one query for both tiles.
  seriesQuery: (range) => buildRiskTilesSeriesQuery(NAMESPACE, ENTITY_INDEX, range),
  countNow: async (range, run) => [
    ...readCounts(await run(buildRiskMoversCountQuery(NAMESPACE, ENTITY_INDEX, range)), COLUMNS),
    ...readCounts(
      await run(buildNewlyHighCriticalCountQuery(NAMESPACE, ENTITY_INDEX, range)),
      COLUMNS
    ),
  ],
  countStepsAgo: async (range, k, run) => {
    const { stepHours } = getSeriesWindow(range);
    return [
      ...readCounts(await run(oracleMovers(range, k * stepHours)), COLUMNS),
      ...readCounts(await run(oracleNewlyHighCritical(range, k * stepHours)), COLUMNS),
    ];
  },
  extraTests: (run) => {
    it.each(RANGES)('one %s query returns the dots of both tiles', async (range) => {
      const result = await run(buildRiskTilesSeriesQuery(NAMESPACE, ENTITY_INDEX, range));
      const { dots } = getSeriesWindow(range);
      const names = result.columns.map((c) => c.name);
      for (let k = 0; k < dots; k++) {
        expect(names).toContain(riskMoversSeriesColumn(k));
        expect(names).toContain(newlyHighCriticalSeriesColumn(k));
      }
      // The tiles differ in this fixture, so one is not a copy of the other.
      expect(readSeriesDots(result, range, riskMoversSeriesColumn)).not.toEqual(
        readSeriesDots(result, range, newlyHighCriticalSeriesColumn)
      );
    });
  },
});
