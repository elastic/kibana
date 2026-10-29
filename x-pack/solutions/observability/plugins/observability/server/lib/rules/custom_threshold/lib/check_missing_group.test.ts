/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { SearchConfigurationType } from '../../../../../common/custom_threshold_rule/types';
import { Aggregators } from '../../../../../common/custom_threshold_rule/types';
import { checkMissingGroups } from './check_missing_group';

const logger = { trace: jest.fn() } as unknown as Logger;

const criterion = {
  metrics: [{ name: 'A', aggType: Aggregators.COUNT as const }],
  timeSize: 1,
  timeUnit: 'm' as const,
  threshold: [1],
  comparator: COMPARATORS.LESS_THAN,
};

const searchConfiguration: SearchConfigurationType = {
  index: {
    index: { id: 'metrics-*', name: 'Metrics', timeFieldName: '@timestamp', title: 'metrics-*' },
  },
  query: { query: '', language: 'kuery' },
};

const esQueryConfig = {
  allowLeadingWildcards: true,
  queryStringOptions: {},
  ignoreFilterIfFieldNotInIndex: false,
};

const missingGroups = [
  { key: 'dc1,website,host-a,w3wp.exe', bucketKey: { groupBy0: 'dc1' } },
  { key: 'dc1,website,host-b,w3wp.exe', bucketKey: { groupBy0: 'dc1' } },
];

const run = (msearchResponses: unknown[]) => {
  const esClient = {
    msearch: jest.fn().mockResolvedValue({ responses: msearchResponses }),
  } as unknown as ElasticsearchClient;

  return checkMissingGroups(
    esClient,
    criterion,
    'metrics-*',
    '@timestamp',
    ['labels.datacenter'],
    searchConfiguration,
    undefined,
    logger,
    { start: Date.now() - 60_000, end: Date.now() },
    esQueryConfig,
    missingGroups
  );
};

describe('checkMissingGroups', () => {
  it('confirms a group as missing when the msearch item succeeds with zero hits', async () => {
    const result = await run([
      {
        took: 1,
        timed_out: false,
        _shards: { total: 3, successful: 3, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      },
      {
        took: 1,
        timed_out: false,
        _shards: { total: 3, successful: 3, failed: 0 },
        hits: { total: { value: 4, relation: 'eq' }, hits: [] },
      },
    ]);

    expect(result).toEqual([missingGroups[0]]);
  });

  // The tests below describe the behaviour we expect when ES is degraded: an msearch item that
  // errored or only partially executed says nothing about whether the group has data, so it must
  // not be reported as a confirmed missing group.
  it('does not confirm a group as missing when its msearch item returned an error', async () => {
    const result = await run([
      { error: { type: 'es_rejected_execution_exception', reason: 'rejected' }, status: 429 },
      {
        took: 1,
        timed_out: false,
        _shards: { total: 3, successful: 3, failed: 0 },
        hits: { total: { value: 4, relation: 'eq' }, hits: [] },
      },
    ]);

    expect(result).toEqual([]);
  });

  it('does not confirm a group as missing when its msearch item had failed shards and zero hits', async () => {
    const result = await run([
      {
        took: 21000,
        timed_out: false,
        _shards: { total: 3, successful: 2, failed: 1 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      },
      {
        took: 1,
        timed_out: false,
        _shards: { total: 3, successful: 3, failed: 0 },
        hits: { total: { value: 4, relation: 'eq' }, hits: [] },
      },
    ]);

    expect(result).toEqual([]);
  });

  it('does not confirm a group as missing when its msearch item timed out with zero hits', async () => {
    const result = await run([
      {
        took: 30000,
        timed_out: true,
        _shards: { total: 3, successful: 3, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      },
      {
        took: 1,
        timed_out: false,
        _shards: { total: 3, successful: 3, failed: 0 },
        hits: { total: { value: 4, relation: 'eq' }, hits: [] },
      },
    ]);

    expect(result).toEqual([]);
  });
});
