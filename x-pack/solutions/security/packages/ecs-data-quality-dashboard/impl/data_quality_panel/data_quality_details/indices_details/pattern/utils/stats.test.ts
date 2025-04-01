/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash/fp';

import { mockIlmExplain } from '../../../../mock/ilm_explain/mock_ilm_explain';
import { mockStats } from '../../../../mock/stats/mock_stats';
import { getIndexNames, getPatternDocsCount, getPatternSizeInBytes } from './stats';
import { IlmExplainLifecycleLifecycleExplain } from '@elastic/elasticsearch/lib/api/types';
import { mockStatsPacketbeatIndex } from '../../../../mock/stats/mock_stats_packetbeat_index';
import { mockStatsAuditbeatIndex } from '../../../../mock/stats/mock_stats_auditbeat_index';

describe('getIndexNames', () => {
  const isILMAvailable = true;
  const ilmPhases = ['hot', 'warm', 'unmanaged'];

  test('returns the expected index names when they have an ILM phase included in the ilmPhases list', () => {
    expect(
      getIndexNames({
        ilmExplain: mockIlmExplain, // <-- the mock indexes have 'hot' ILM phases
        ilmPhases,
        isILMAvailable,
        stats: mockStats,
      })
    ).toEqual([
      '.ds-packetbeat-8.6.1-2023.02.04-000001',
      '.ds-packetbeat-8.5.3-2023.02.04-000001',
      'auditbeat-custom-index-1',
    ]);
  });

  test('returns the expected filtered index names when they do NOT have an ILM phase included in the ilmPhases list', () => {
    expect(
      getIndexNames({
        ilmExplain: mockIlmExplain, // <-- the mock indexes have 'hot' and 'unmanaged' ILM phases...
        ilmPhases: ['warm', 'unmanaged'], // <-- ...but we don't ask for 'hot'
        isILMAvailable,
        stats: mockStats,
      })
    ).toEqual(['auditbeat-custom-index-1']); // <-- the 'unmanaged' index
  });

  test('returns the expected index names when the `ilmExplain` is missing a record for an index', () => {
    // the following `ilmExplain` is missing a record for one of the two packetbeat indexes:
    const ilmExplainWithMissingIndex: Record<string, IlmExplainLifecycleLifecycleExplain> = omit(
      '.ds-packetbeat-8.6.1-2023.02.04-000001',
      mockIlmExplain
    );

    expect(
      getIndexNames({
        ilmExplain: ilmExplainWithMissingIndex, // <-- the mock indexes have 'hot' ILM phases...
        ilmPhases: ['hot', 'warm', 'unmanaged'],
        isILMAvailable,
        stats: mockStats,
      })
    ).toEqual(['.ds-packetbeat-8.5.3-2023.02.04-000001', 'auditbeat-custom-index-1']); // <-- only includes two of the three indices, because the other one is missing an ILM explain record
  });

  test('returns empty index names when `ilmPhases` is empty', () => {
    expect(
      getIndexNames({
        ilmExplain: mockIlmExplain,
        ilmPhases: [],
        isILMAvailable,
        stats: mockStats,
      })
    ).toEqual([]);
  });

  test('returns empty index names when they have an ILM phase that matches', () => {
    expect(
      getIndexNames({
        ilmExplain: null,
        ilmPhases,
        isILMAvailable,
        stats: mockStats,
      })
    ).toEqual([]);
  });

  test('returns empty index names when just `stats` is null', () => {
    expect(
      getIndexNames({
        ilmExplain: mockIlmExplain,
        ilmPhases,
        isILMAvailable,
        stats: null,
      })
    ).toEqual([]);
  });

  test('returns empty index names when both `ilmExplain` and `stats` are null', () => {
    expect(
      getIndexNames({
        ilmExplain: null,
        ilmPhases,
        isILMAvailable,
        stats: null,
      })
    ).toEqual([]);
  });
});

describe('getPatternDocsCount', () => {
  test('it returns the expected total given a subset of index names in the stats', () => {
    const indexName = '.ds-packetbeat-8.5.3-2023.02.04-000001';
    const expectedCount = mockStatsPacketbeatIndex[indexName].num_docs;

    expect(
      getPatternDocsCount({
        indexNames: [indexName],
        stats: mockStatsPacketbeatIndex,
      })
    ).toEqual(expectedCount);
  });

  test('it returns the expected total given all index names in the stats', () => {
    const allIndexNamesInStats = [
      '.ds-packetbeat-8.6.1-2023.02.04-000001',
      '.ds-packetbeat-8.5.3-2023.02.04-000001',
    ];

    expect(
      getPatternDocsCount({
        indexNames: allIndexNamesInStats,
        stats: mockStatsPacketbeatIndex,
      })
    ).toEqual(3258632);
  });

  test('it returns zero given an empty collection of index names', () => {
    expect(
      getPatternDocsCount({
        indexNames: [], // <-- empty
        stats: mockStatsPacketbeatIndex,
      })
    ).toEqual(0);
  });

  test('it returns the expected total for a green index', () => {
    const indexName = 'auditbeat-custom-index-1';
    const expectedCount = mockStatsAuditbeatIndex[indexName].num_docs;

    expect(
      getPatternDocsCount({
        indexNames: [indexName],
        stats: mockStatsAuditbeatIndex,
      })
    ).toEqual(expectedCount);
  });
});

describe('getPatternSizeInBytes', () => {
  test('it returns the expected total given a subset of index names in the stats', () => {
    const indexName = '.ds-packetbeat-8.5.3-2023.02.04-000001';
    const expectedCount = mockStatsPacketbeatIndex[indexName].size_in_bytes;

    expect(
      getPatternSizeInBytes({
        indexNames: [indexName],
        stats: mockStatsPacketbeatIndex,
      })
    ).toEqual(expectedCount);
  });

  test('it returns the expected total given all index names in the stats', () => {
    const allIndexNamesInStats = [
      '.ds-packetbeat-8.6.1-2023.02.04-000001',
      '.ds-packetbeat-8.5.3-2023.02.04-000001',
    ];

    expect(
      getPatternSizeInBytes({
        indexNames: allIndexNamesInStats,
        stats: mockStatsPacketbeatIndex,
      })
    ).toEqual(1464758182);
  });

  test('it returns undefined given an empty collection of index names', () => {
    expect(
      getPatternSizeInBytes({
        indexNames: [], // <-- empty
        stats: mockStatsPacketbeatIndex,
      })
    ).toBeUndefined();
  });

  test('it returns undefined if sizeInByte in not an integer', () => {
    const indexName = 'auditbeat-custom-index-1';

    expect(
      getPatternSizeInBytes({
        indexNames: [indexName],
        stats: { [indexName]: { ...mockStatsAuditbeatIndex[indexName], size_in_bytes: null } },
      })
    ).toBeUndefined();
  });

  test('it returns the expected total for an index', () => {
    const indexName = 'auditbeat-custom-index-1';
    const expectedCount = mockStatsAuditbeatIndex[indexName].size_in_bytes;

    expect(
      getPatternSizeInBytes({
        indexNames: [indexName],
        stats: mockStatsAuditbeatIndex,
      })
    ).toEqual(expectedCount);
  });

  test('it returns the expected total for indices', () => {
    const expectedCount = Object.values(mockStatsPacketbeatIndex).reduce(
      (acc, { size_in_bytes: sizeInBytes }) => {
        return acc + (sizeInBytes ?? 0);
      },
      0
    );

    expect(
      getPatternSizeInBytes({
        indexNames: [
          '.ds-packetbeat-8.6.1-2023.02.04-000001',
          '.ds-packetbeat-8.5.3-2023.02.04-000001',
        ],
        stats: mockStatsPacketbeatIndex,
      })
    ).toEqual(expectedCount);
  });
});
