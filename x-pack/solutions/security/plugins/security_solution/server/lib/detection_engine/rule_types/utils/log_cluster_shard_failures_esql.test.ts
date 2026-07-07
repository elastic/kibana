/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EsqlEsqlShardFailure } from '@elastic/elasticsearch/lib/api/types';
import type { EsqlTable } from '../esql/esql_request';
import type { SearchAfterAndBulkCreateReturnType } from '../types';
import { logClusterShardFailuresEsql } from './log_cluster_shard_failures_esql';

describe('logClusterShardFailuresEsql', () => {
  let mockResult: SearchAfterAndBulkCreateReturnType;

  beforeEach(() => {
    mockResult = {
      warningMessages: [],
      bulkCreateTimes: [],
      createdSignalsCount: 0,
      createdSignals: [],
      errors: [],
      searchAfterTimes: [],
      success: true,
      warning: false,
      enrichmentTimes: [],
    };
  });

  it('should not add warning message when no shard failures exist', () => {
    const response: EsqlTable = {
      columns: [],
      values: [],
      _clusters: {
        details: {},
      },
    };

    logClusterShardFailuresEsql({ response, result: mockResult });
    expect(mockResult.warningMessages).toHaveLength(0);
  });

  it('should add warning message when shard failures exist in a single cluster', () => {
    const shardFailure: EsqlEsqlShardFailure = {
      reason: { type: 'test_failure', reason: 'test failure' },
      shard: 0,
      index: 'test-index',
    };

    const response: EsqlTable = {
      columns: [],
      values: [],
      _clusters: {
        details: {
          'cluster-1': {
            failures: [shardFailure],
          },
        },
      },
    };

    logClusterShardFailuresEsql({ response, result: mockResult });
    expect(mockResult.warningMessages).toHaveLength(1);
    expect(mockResult.warningMessages[0]).toBe(
      `The ES|QL event query was only executed on the available shards. The query failed to run successfully on the following shards: ${JSON.stringify(
        [shardFailure]
      )}`
    );
  });

  it('should add warning message when shard failures exist in multiple clusters', () => {
    const shardFailure1: EsqlEsqlShardFailure = {
      reason: { type: 'test_failure_1', reason: 'test failure 1' },
      shard: 0,
      index: 'test-index-1',
    };

    const shardFailure2: EsqlEsqlShardFailure = {
      reason: { type: 'test_failure_2', reason: 'test failure 2' },
      shard: 1,
      index: 'test-index-2',
    };

    const response: EsqlTable = {
      columns: [],
      values: [],
      _clusters: {
        details: {
          'cluster-1': {
            failures: [shardFailure1],
          },
          'cluster-2': {
            failures: [shardFailure2],
          },
        },
      },
    };

    logClusterShardFailuresEsql({ response, result: mockResult });
    expect(mockResult.warningMessages).toHaveLength(1);
    expect(mockResult.warningMessages[0]).toBe(
      `The ES|QL event query was only executed on the available shards. The query failed to run successfully on the following shards: ${JSON.stringify(
        [shardFailure1, shardFailure2]
      )}`
    );
  });

  it('should handle undefined _clusters property', () => {
    const response: EsqlTable = {
      columns: [],
      values: [],
    };

    logClusterShardFailuresEsql({ response, result: mockResult });
    expect(mockResult.warningMessages).toHaveLength(0);
  });

  it('should handle undefined details property', () => {
    const response: EsqlTable = {
      columns: [],
      values: [],
      _clusters: {},
    };

    logClusterShardFailuresEsql({ response, result: mockResult });
    expect(mockResult.warningMessages).toHaveLength(0);
  });
});
