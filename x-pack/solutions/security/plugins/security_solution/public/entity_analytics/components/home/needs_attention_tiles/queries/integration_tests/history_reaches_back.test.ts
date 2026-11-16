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
import { getAlertsIndex, getRiskScoreIndex } from '../../../entities_grid/queries/esql';
import {
  buildAlertsHistoryReachesBackQuery,
  buildAnomaliesHistoryReachesBackQuery,
  buildNewEntityHistoryReachesBackQuery,
} from '../history_reaches_back';
import { buildRiskHistoryReachesBackQuery } from '../risk_previous_period';

/*
 * A delta needs data from before NOW() - 2 x range. Over 7d that is before 14 days ago. Each source
 * is checked by its oldest doc: 20 days old reaches back, 10 days old does not, none does not.
 * The risk tiles need scores before the start (14 days ago) AND before the end (7 days ago) of the
 * previous period.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DATE: MappingProperty = { type: 'date' };
const KEYWORD: MappingProperty = { type: 'keyword' };
const RANGE = '7d';

const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();
/** An hour before the moment `days` ago, inside the two-hour window the risk check reads. */
const justBefore = (days: number) => new Date(Date.now() - days * DAY_MS - HOUR_MS).toISOString();

describe('history checks on Elasticsearch', () => {
  let esServer: ReturnType<typeof createTestEsCluster>;
  let client: Client;

  const create = (index: string, properties: Record<string, MappingProperty>, lookup = false) =>
    client.indices.create({
      index,
      ...(lookup ? { settings: { index: { mode: 'lookup' } } } : {}),
      mappings: { properties },
    });
  const index = async (name: string, docs: object[]) => {
    if (!docs.length) return;
    const response = await client.bulk({
      operations: docs.flatMap((doc) => [{ index: { _index: name } }, doc]),
      refresh: 'wait_for',
    });
    if (response.errors) throw new Error(`Bulk indexing of ${name} failed`);
  };
  const reachesBack = async (query: string) => {
    const { columns, values } = await client.esql.query({ query });
    expect(columns.map(({ name }) => name)).toEqual(['reaches_back']);
    return values[0][0];
  };

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
    client = esServer.getClient();

    // Alerts: one index per space.
    const alert = { '@timestamp': DATE };
    for (const [space, days] of [
      ['old', 20],
      ['young', 10],
    ] as const) {
      await create(getAlertsIndex(space), alert);
      await index(getAlertsIndex(space), [
        { '@timestamp': daysAgo(days) },
        { '@timestamp': daysAgo(1) },
      ]);
    }
    await create(getAlertsIndex('empty'), alert);

    // Anomaly records: job_a is old, job_b is young, job_x (not installed) is old. job_low has only
    // sub-threshold records before the start and a qualifying one now, job_interim and job_bucket
    // only an interim record and a bucket result before the start.
    await create('.ml-anomalies-shared-history-test', {
      '@timestamp': DATE,
      result_type: KEYWORD,
      job_id: KEYWORD,
      is_interim: { type: 'boolean' },
      record_score: { type: 'double' },
    });
    const record = (job: string, days: number, overrides: object = {}) => ({
      '@timestamp': daysAgo(days),
      result_type: 'record',
      job_id: job,
      is_interim: false,
      record_score: 50,
      ...overrides,
    });
    await index('.ml-anomalies-shared-history-test', [
      record('job_a', 20),
      record('job_b', 10),
      record('job_x', 40),
      record('job_low', 20, { record_score: 0.5 }),
      record('job_low', 1),
      record('job_interim', 20, { is_interim: true }),
      record('job_interim', 1),
      record('job_bucket', 20, { result_type: 'bucket' }),
      record('job_bucket', 1),
    ]);

    // Entities: the oldest first_seen.
    const entity = { 'entity.id': KEYWORD, 'entity.lifecycle.first_seen': DATE };
    await create('entities-history-old', entity, true);
    await index('entities-history-old', [
      { 'entity.id': 'host:a', 'entity.lifecycle.first_seen': daysAgo(20) },
      { 'entity.id': 'host:b', 'entity.lifecycle.first_seen': daysAgo(1) },
    ]);
    await create('entities-history-young', entity, true);
    await index('entities-history-young', [
      { 'entity.id': 'host:a', 'entity.lifecycle.first_seen': daysAgo(10) },
    ]);
    await create('entities-history-empty', entity, true);

    // Risk scores: docs just before the start (14 days ago) and/or the end (7 days ago).
    const risk = { '@timestamp': DATE };
    const riskDocs: Record<string, object[]> = {
      both: [{ '@timestamp': justBefore(14) }, { '@timestamp': justBefore(7) }],
      startonly: [{ '@timestamp': justBefore(14) }],
      endonly: [{ '@timestamp': justBefore(7) }],
      none: [{ '@timestamp': daysAgo(1) }],
      // Docs but not inside either window: more than two hours before each moment.
      toofar: [
        { '@timestamp': new Date(Date.now() - 14 * DAY_MS - 5 * HOUR_MS).toISOString() },
        { '@timestamp': new Date(Date.now() - 7 * DAY_MS - 5 * HOUR_MS).toISOString() },
      ],
    };
    for (const [space, docs] of Object.entries(riskDocs)) {
      await create(getRiskScoreIndex(space), risk);
      await index(getRiskScoreIndex(space), docs);
    }
  }, 300_000);

  afterAll(async () => {
    await esServer?.stop();
  });

  describe('alerts', () => {
    it.each([
      ['an oldest alert 20 days old reaches back over 7d', 'old', true],
      ['an oldest alert 10 days old does not', 'young', false],
      ['no alert does not', 'empty', false],
    ])('%s', async (_name, space, expected) => {
      expect(await reachesBack(buildAlertsHistoryReachesBackQuery(space, RANGE))).toBe(expected);
    });

    it('reaches back over 24h with an alert 10 days old, which is older than 2 days', async () => {
      expect(await reachesBack(buildAlertsHistoryReachesBackQuery('young', '24h'))).toBe(true);
    });
  });

  describe('anomalies', () => {
    it.each([
      ['an old record of an installed job reaches back', ['job_a'], true],
      ['a young record of an installed job does not', ['job_b'], false],
      ['an old record of a job that is not installed does not count', ['job_b', 'job_c'], false],
      ['the oldest record of any installed job counts', ['job_a', 'job_b'], true],
    ])('%s', async (_name, jobs, expected) => {
      expect(await reachesBack(buildAnomaliesHistoryReachesBackQuery(RANGE, [...jobs]))).toBe(
        expected
      );
    });

    it('counts an old record below the tile score threshold: the history is there', async () => {
      expect(await reachesBack(buildAnomaliesHistoryReachesBackQuery(RANGE, ['job_low']))).toBe(
        true
      );
    });

    it.each([
      ['an interim record', 'job_interim'],
      ['a result that is not a record', 'job_bucket'],
    ])('does not count %s', async (_name, job) => {
      expect(await reachesBack(buildAnomaliesHistoryReachesBackQuery(RANGE, [job]))).toBe(false);
    });

    it('does not count a job that has no record at all', async () => {
      expect(await reachesBack(buildAnomaliesHistoryReachesBackQuery(RANGE, ['job_none']))).toBe(
        false
      );
    });
  });

  describe('new entity', () => {
    it.each([
      ['an entity first seen 20 days ago reaches back', 'entities-history-old', true],
      ['the oldest entity first seen 10 days ago does not', 'entities-history-young', false],
      ['no entity does not', 'entities-history-empty', false],
    ])('%s', async (_name, entitiesIndex, expected) => {
      expect(await reachesBack(buildNewEntityHistoryReachesBackQuery(entitiesIndex, RANGE))).toBe(
        expected
      );
    });
  });

  describe('risk', () => {
    it.each([
      ['scores at the start AND the end of the previous period reach back', 'both', true],
      ['scores only at the start do not (scoring paused around the end)', 'startonly', false],
      ['scores only at the end do not', 'endonly', false],
      ['scores that are not near either moment do not', 'toofar', false],
      ['recent scores only do not', 'none', false],
    ])('%s', async (_name, space, expected) => {
      expect(await reachesBack(buildRiskHistoryReachesBackQuery(space, RANGE))).toBe(expected);
    });
  });
});
