/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { getRiskScoreIndex } from '../../../entities_grid/queries/esql';
import { buildRiskMoversCountQuery } from '../tile_risk_movers_query';

/*
 * The Risk movers count reads the entities that have a current score. A mover needs a current score
 * at least 10 above its boundary score and scores are never negative, so an entity whose current
 * score is below 10 can never count. The query therefore reads only entities with a current score
 * of 10 or more, which keeps the read from growing with every entity that was ever scored: an entity
 * that stops alerting is reset to a score of 0 (not null) and stays in the store.
 *
 * | entity.id          | boundary score | current score | mover? | notes                              |
 * |--------------------|----------------|---------------|--------|------------------------------------|
 * | host:reset-to-zero | 70             | 0             | no     | stopped alerting, reset to 0       |
 * | host:zero-zero     | 0              | 0             | no     |                                    |
 * | host:small-rise    | 0              | 8             | no     | rose by 8                          |
 * | host:nine          | 0              | 9.5           | no     | rose by less than 10               |
 * | host:ten-from-zero | 0              | 10            | yes    | exactly 10, from a score of 0      |
 * | host:rise          | 20             | 60            | yes    |                                    |
 * | host:dropped       | 90             | 15            | no     | went down                          |
 * | host:never-scored  | 30             | none          | no     | no current score at all            |
 */

const NAMESPACE = 'default';
const ENTITY_INDEX = 'entities-latest-low-scores-test';
const HOUR_MS = 60 * 60 * 1000;
const BOUNDARY_MS = 30 * 24 * HOUR_MS;

const ENTITIES: ReadonlyArray<{ id: string; boundary: number; current?: number }> = [
  { id: 'host:reset-to-zero', boundary: 70, current: 0 },
  { id: 'host:zero-zero', boundary: 0, current: 0 },
  { id: 'host:small-rise', boundary: 0, current: 8 },
  { id: 'host:nine', boundary: 0, current: 9.5 },
  { id: 'host:ten-from-zero', boundary: 0, current: 10 },
  { id: 'host:rise', boundary: 20, current: 60 },
  { id: 'host:dropped', boundary: 90, current: 15 },
  { id: 'host:never-scored', boundary: 30 },
];

describe('Risk movers count and entities with a low current score, on Elasticsearch', () => {
  let esServer: ReturnType<typeof createTestEsCluster>;
  let client: Client;

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
    client = esServer.getClient();
    await client.indices.create({
      index: ENTITY_INDEX,
      mappings: {
        properties: {
          'entity.id': { type: 'keyword' },
          'entity.name': { type: 'keyword' },
          'entity.risk.calculated_score_norm': { type: 'float' },
          'entity.relationships.resolution.resolved_to': { type: 'keyword' },
        },
      },
    });
    await client.indices.create({
      index: getRiskScoreIndex(NAMESPACE),
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          'host.risk.id_value': { type: 'keyword' },
          'host.risk.calculated_score_norm': { type: 'float' },
        },
      },
    });
    const now = Date.now();
    const operations = ENTITIES.flatMap(({ id, boundary, current }) => [
      { index: { _index: ENTITY_INDEX } },
      {
        'entity.id': id,
        'entity.name': id.split(':')[1],
        ...(current === undefined ? {} : { 'entity.risk.calculated_score_norm': current }),
      },
      { index: { _index: getRiskScoreIndex(NAMESPACE) } },
      {
        // Half an hour before the 30 day boundary, inside the two hours the boundary score is read from.
        '@timestamp': new Date(now - BOUNDARY_MS - 0.5 * HOUR_MS).toISOString(),
        'host.risk.id_value': id,
        'host.risk.calculated_score_norm': boundary,
      },
    ]);
    const response = await client.bulk({ operations, refresh: 'wait_for' });
    if (response.errors) throw new Error('Bulk indexing of the low score fixture failed');
  }, 300_000);

  afterAll(async () => {
    await esServer?.stop();
  });

  const run = async (query: string) => {
    const { columns, values } = await client.esql.query({ query });
    const row = Object.fromEntries(columns.map(({ name }, i) => [name, values[0]?.[i]]));
    return {
      value: Number(row.value ?? 0),
      entityIds: [row.entity_ids ?? []].flat().map(String).sort(),
    };
  };

  const shipped = buildRiskMoversCountQuery(NAMESPACE, ENTITY_INDEX, '30d');
  /** The same query with the entity branch as it was: every entity that has a score. */
  const readingEveryScoredEntity = shipped.replace(
    /entity\.risk\.calculated_score_norm >= \d+ AND/,
    'entity.risk.calculated_score_norm IS NOT NULL AND'
  );

  it('counts the entities that rose by 10 or more, also from a score of 0', async () => {
    expect(await run(shipped)).toEqual({
      value: 2,
      entityIds: ['host:rise', 'host:ten-from-zero'],
    });
  });

  it('gives the same count and ids as reading every scored entity', async () => {
    // Guards the premise of the filter: it must change what is read, not what is counted.
    expect(readingEveryScoredEntity).not.toBe(shipped);
    expect(await run(readingEveryScoredEntity)).toEqual(await run(shipped));
  });

  it('still returns one row with a count of 0 when no entity can qualify', async () => {
    // Every entity left in view has a current score below 10, so the filtered entity branch reads
    // nothing. The tile must get a real 0 (one row), not an empty result.
    const belowTen = ['host:reset-to-zero', 'host:zero-zero', 'host:small-rise', 'host:nine'];
    const { columns, values } = await client.esql.query({
      query: buildRiskMoversCountQuery(NAMESPACE, ENTITY_INDEX, '30d', [
        `| WHERE entity.id IN (${belowTen.map((id) => `"${id}"`).join(', ')})`,
      ]),
    });
    expect(values).toHaveLength(1);
    expect(values[0][columns.findIndex(({ name }) => name === 'value')]).toBe(0);
  });

  it('reads only the entities that can qualify', async () => {
    const countRows = async (where: string) => {
      const { values } = await client.esql.query({
        query: `FROM ${ENTITY_INDEX} | WHERE ${where} | STATS rows = COUNT(*)`,
      });
      return Number(values[0]?.[0]);
    };
    const predicate = /entity\.risk\.calculated_score_norm >= \d+/.exec(shipped)?.[0];
    expect(predicate).toBeDefined();
    // Seven entities have a score, but only three have a current score of 10 or more.
    expect(await countRows('entity.risk.calculated_score_norm IS NOT NULL')).toBe(7);
    expect(await countRows(predicate as string)).toBe(3);
  });
});
