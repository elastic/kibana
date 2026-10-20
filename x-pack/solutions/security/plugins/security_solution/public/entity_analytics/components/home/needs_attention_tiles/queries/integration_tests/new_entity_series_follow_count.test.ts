/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { buildNewEntityCountQuery } from '../new_entity_query';
import { buildNewEntitySeriesQuery, newEntitySeriesColumn } from '../new_entity_series_query';
import {
  describeSeriesFollowsCount,
  moveWindowBack,
  readCounts,
} from './series_follow_count_suite';

/*
 * The New entity sparkline dots must follow the tile count. Dot k is the count query with its
 * first_seen window moved back k steps, so this test runs the real count query once per dot.
 * Entities sit half an hour off a whole hour, so none is on the edge of a bucket.
 *
 * | entity.id | first_seen (hours ago) | risk score | notes                                      |
 * |-----------|------------------------|------------|--------------------------------------------|
 * | host:n1   | 0.5                    | 5          |                                            |
 * | host:n2   | 5.5                    | 5          |                                            |
 * | host:n3   | 5.5                    | 0          | dropped: risk score is not above 0         |
 * | host:n4   | 30.5                   | 5          |                                            |
 * | host:n5   | 100.5                  | 5          |                                            |
 * | host:n6   | 400.5                  | 5          |                                            |
 * | host:n7   | 1200.5                 | 5          | older than the 30d window                  |
 * | host:gold | 2000                   | 5          | old itself                                 |
 * | host:a1   | 3.5                    | 5          | alias of host:gold: the group is old, so not new |
 * | host:a2   | 4.5                    | 5          | second alias of host:gold: same            |
 * | host:grp  | 10.5                   | 0 (group 7)| new: the group's score is above 0          |
 * | host:grpa | 20.5                   | 5          | alias of host:grp: the group was first seen 20.5h ago |
 * | host:zero | 6.5                    | 5 (group 0)| dropped: the group's score is 0            |
 * | host:zeroa| 8.5                    | 5          | alias of host:zero                         |
 * | host:hd   | 30.5                   | 5          | main entity older than its alias: the group was first seen 30.5h ago |
 * | host:hda  | 3.5                    | 5          | alias of host:hd (not new in the 24h dots now, but new 7h ago and earlier) |
 */

const ENTITY_INDEX = 'entities-latest-new-entity-series-test';
const HOUR_MS = 60 * 60 * 1000;
const KEYWORD: MappingProperty = { type: 'keyword' };
const DATE: MappingProperty = { type: 'date' };

const ENTITIES: ReadonlyArray<{
  id: string;
  hoursAgo: number;
  score: number;
  /** The group's own (resolution) score, on a main entity. */
  groupScore?: number;
  resolvedTo?: string;
}> = [
  { id: 'host:n1', hoursAgo: 0.5, score: 5 },
  { id: 'host:n2', hoursAgo: 5.5, score: 5 },
  { id: 'host:n3', hoursAgo: 5.5, score: 0 },
  { id: 'host:n4', hoursAgo: 30.5, score: 5 },
  { id: 'host:n5', hoursAgo: 100.5, score: 5 },
  { id: 'host:n6', hoursAgo: 400.5, score: 5 },
  { id: 'host:n7', hoursAgo: 1200.5, score: 5 },
  { id: 'host:gold', hoursAgo: 2000, score: 5 },
  { id: 'host:a1', hoursAgo: 3.5, score: 5, resolvedTo: 'host:gold' },
  { id: 'host:a2', hoursAgo: 4.5, score: 5, resolvedTo: 'host:gold' },
  { id: 'host:grp', hoursAgo: 10.5, score: 0, groupScore: 7 },
  { id: 'host:grpa', hoursAgo: 20.5, score: 5, resolvedTo: 'host:grp' },
  { id: 'host:zero', hoursAgo: 6.5, score: 5, groupScore: 0 },
  { id: 'host:zeroa', hoursAgo: 8.5, score: 5, resolvedTo: 'host:zero' },
  { id: 'host:hd', hoursAgo: 30.5, score: 5 },
  { id: 'host:hda', hoursAgo: 3.5, score: 5, resolvedTo: 'host:hd' },
];
const loadFixture = async (client: Client) => {
  await client.indices.create({
    index: ENTITY_INDEX,
    settings: { index: { mode: 'lookup' } },
    mappings: {
      properties: {
        'entity.id': KEYWORD,
        'entity.name': KEYWORD,
        'entity.risk.calculated_score': { type: 'double' },
        'entity.relationships.resolution.risk.calculated_score': { type: 'double' },
        'entity.lifecycle.first_seen': DATE,
        'entity.relationships.resolution.resolved_to': KEYWORD,
      },
    },
  });
  const now = Date.now();
  const response = await client.bulk({
    operations: ENTITIES.flatMap(({ id, hoursAgo, score, groupScore, resolvedTo }) => [
      { index: { _index: ENTITY_INDEX } },
      {
        'entity.id': id,
        'entity.name': id.split(':')[1],
        'entity.risk.calculated_score': score,
        ...(groupScore === undefined
          ? {}
          : { 'entity.relationships.resolution.risk.calculated_score': groupScore }),
        'entity.lifecycle.first_seen': new Date(now - hoursAgo * HOUR_MS).toISOString(),
        ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
      },
    ]),
    refresh: 'wait_for',
  });
  if (response.errors) throw new Error('Bulk indexing of the New entity series fixture failed');
};

const FIRST_SEEN = 'entity.lifecycle.first_seen';

describeSeriesFollowsCount({
  name: 'New entity tile series',
  loadFixture,
  tiles: [
    {
      name: 'New entity',
      column: newEntitySeriesColumn,
      // 24h: n1, n2 and host:grp (its group was first seen 20.5h ago, through the alias). Not n3
      // (score 0), n4 (30.5h old), host:gold (old, whatever its aliases) or host:zero (group score 0).
      // 30d: n1, n2, n4, n5, n6, host:grp and host:hd (30.5h old through its main entity, whatever
      // the age of its alias). Not n7 (50 days old).
      byHand: { '24h': 3, '30d': 7 },
    },
  ],
  seriesQuery: (range) => buildNewEntitySeriesQuery(ENTITY_INDEX, range),
  countNow: async (range, run) =>
    readCounts(await run(buildNewEntityCountQuery(ENTITY_INDEX, range)), ['value']),
  // The count has the window twice: the start of what it reads, and the group's first seen.
  countStepsAgo: async (range, k, run) =>
    readCounts(
      await run(
        moveWindowBack({
          base: moveWindowBack({
            base: buildNewEntityCountQuery(ENTITY_INDEX, range),
            window: /entity\.lifecycle\.first_seen >= NOW\(\) - \d+ (days|hours)/,
            field: FIRST_SEEN,
            // The main entities are read from the start of the window on: a group counts when its
            // earliest member is in the window, whenever its main entity was first seen after that.
            lowerBoundOnly: true,
            range,
            k,
          }),
          window: /group_first_seen >= NOW\(\) - \d+ (days|hours)/,
          field: 'group_first_seen',
          range,
          k,
        })
      ),
      ['value']
    ),
});
