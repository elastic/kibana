/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import {
  buildBucketHistoryFilter,
  filterBucketHistory,
  groupAndBulkCreate,
} from './group_and_bulk_create';
import type { BucketHistory } from './group_and_bulk_create';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import { getSharedParamsMock } from '../../__mocks__/shared_params';
import { getNoReadableShardsWarning } from '../../utils/no_readable_shards';

describe('groupAndBulkCreate utils', () => {
  const bucketHistory: BucketHistory[] = [
    {
      key: {
        'host.name': 'host-0',
        'source.ip': '127.0.0.1',
      },
      endDate: '2022-11-01T12:00:00Z',
    },
    {
      key: {
        'host.name': 'host-1',
        'source.ip': '192.0.0.1',
      },
      endDate: '2022-11-01T12:05:00Z',
    },
  ];

  it('buildBucketHistoryFilter should create the expected query', () => {
    const from = moment('2022-11-01T11:30:00Z');

    const filter = buildBucketHistoryFilter({
      bucketHistory,
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      from,
    });

    expect(filter).toMatchSnapshot();
  });

  it('filterBucketHistory should remove outdated buckets', () => {
    const fromDate = new Date('2022-11-01T12:02:00Z');

    const filteredBuckets = filterBucketHistory({ bucketHistory, fromDate });

    expect(filteredBuckets).toEqual([
      {
        key: {
          'host.name': 'host-1',
          'source.ip': '192.0.0.1',
        },
        endDate: '2022-11-01T12:05:00Z',
      },
    ]);
  });
});

describe('groupAndBulkCreate', () => {
  const inputIndex = ['logs-m365_defender.incident-*'];
  const sharedParams = getSharedParamsMock({
    ruleParams: getQueryRuleParams({
      alertSuppression: { groupBy: ['host.name'] },
    }),
    rewrites: { inputIndex },
  });
  let ruleServices: PersistenceExecutorOptionsMock;

  const emptyResponse = ({ shardsTotal }: { shardsTotal: number }) => ({
    took: 1,
    timed_out: false,
    _shards: { total: shardsTotal, successful: shardsTotal, failed: 0, skipped: 0 },
    hits: { total: { value: 0, relation: 'eq' as const }, max_score: null, hits: [] },
  });

  const run = (params: Partial<Parameters<typeof groupAndBulkCreate>[0]> = {}) =>
    groupAndBulkCreate({
      sharedParams,
      services: ruleServices,
      filter: { match_all: {} },
      buildReasonMessage: jest.fn().mockReturnValue('reason'),
      groupByFields: ['host.name'],
      eventsTelemetry: undefined,
      isLoggedRequestsEnabled: false,
      ...params,
    });

  beforeEach(() => {
    ruleServices = createPersistenceExecutorOptionsMock();
  });

  it('reports a warning instead of failing when the search resolved to no shards', async () => {
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      emptyResponse({ shardsTotal: 0 })
    );

    const result = await run();

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.createdSignalsCount).toBe(0);
    expect(result.warningMessages).toEqual([getNoReadableShardsWarning({ inputIndex })]);
  });

  it('fails with the shard failures as user errors instead of the generic aggregations error', async () => {
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce({
      ...emptyResponse({ shardsTotal: 1 }),
      _shards: {
        total: 1,
        successful: 0,
        failed: 1,
        skipped: 0,
        failures: [
          {
            shard: 0,
            index: 'logs-m365_defender.incident-default',
            node: 'node-1',
            reason: {
              type: 'security_exception',
              reason: 'action [indices:data/read/search] is unauthorized for user [analyst]',
            },
          },
        ],
      },
    });

    const result = await run();

    expect(result.success).toBe(false);
    expect(result.userError).toBe(true);
    expect(result.errors).toEqual([
      'index: "logs-m365_defender.incident-default" reason: "action [indices:data/read/search] is unauthorized for user [analyst]" type: "security_exception"',
    ]);
    expect(result.warningMessages).toEqual([]);
  });

  it('still fails with the generic error when shards were searched but aggregations are missing', async () => {
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      emptyResponse({ shardsTotal: 3 })
    );

    const result = await run();

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['expected to find aggregations on search result']);
    expect(result.warningMessages).toEqual([]);
  });
});
