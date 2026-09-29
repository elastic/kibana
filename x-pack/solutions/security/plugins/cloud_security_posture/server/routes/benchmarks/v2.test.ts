/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getBenchmarksData } from './v2';

vi.mock('../benchmark_rules/get_states/v1', () => {
      const mocked = {
      getMutedRulesFilterQuery: vi.fn().mockResolvedValue([]),
    };
      return { ...mocked, default: mocked };
    });

describe('getBenchmarksData PIT refresh', () => {
  it('rolls forward pit_id between searches and uses latest for close', async () => {
    const soClient = savedObjectsClientMock.create();
    const encryptedSoClient = savedObjectsClientMock.create();

    soClient.find.mockResolvedValue({
      aggregations: {
        benchmark_id: {
          buckets: [
            {
              key: 'cis_k8s',
              doc_count: 1,
              name: {
                buckets: [
                  {
                    key: 'CIS Kubernetes',
                    doc_count: 1,
                    version: {
                      buckets: [
                        { key: 'v1.0.0', doc_count: 1 },
                        { key: 'v2.0.0', doc_count: 1 },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    } as any);

    const esClient = {
      openPointInTime: vi.fn().mockResolvedValue({ id: 'pit-0' }),
      search: vi
        .fn()
        .mockResolvedValueOnce({
          pit_id: 'pit-1',
          aggregations: {
            failed_findings: { doc_count: 1 },
            passed_findings: { doc_count: 2 },
            resources_evaluated: { value: 3 },
          },
        })
        .mockResolvedValueOnce({
          pit_id: 'pit-2',
          aggregations: { asset_count: { value: 5 } },
        })
        .mockResolvedValueOnce({
          pit_id: 'pit-3',
          aggregations: {
            failed_findings: { doc_count: 2 },
            passed_findings: { doc_count: 3 },
            resources_evaluated: { value: 4 },
          },
        })
        .mockResolvedValueOnce({
          pit_id: 'pit-4',
          aggregations: { asset_count: { value: 7 } },
        }),
      closePointInTime: vi.fn().mockResolvedValue({ succeeded: true, num_freed: 1 }),
    };

    const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };

    const result = await getBenchmarksData(
      soClient,
      encryptedSoClient,
      esClient as any,
      logger as any
    );

    expect(esClient.search.mock.calls[0][0].pit.id).toBe('pit-0');
    expect(esClient.search.mock.calls[1][0].pit.id).toBe('pit-1');
    expect(esClient.search.mock.calls[2][0].pit.id).toBe('pit-2');
    expect(esClient.search.mock.calls[3][0].pit.id).toBe('pit-3');
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-4' });

    // evaluation is the distinct-asset cardinality count per benchmark version
    expect(result.map((benchmark) => benchmark.evaluation)).toEqual([5, 7]);
  });

  it('closes the PIT even when a search throws', async () => {
    const soClient = savedObjectsClientMock.create();
    const encryptedSoClient = savedObjectsClientMock.create();

    soClient.find.mockResolvedValue({
      aggregations: {
        benchmark_id: {
          buckets: [
            {
              key: 'cis_k8s',
              doc_count: 1,
              name: {
                buckets: [
                  {
                    key: 'CIS Kubernetes',
                    doc_count: 1,
                    version: { buckets: [{ key: 'v1.0.0', doc_count: 1 }] },
                  },
                ],
              },
            },
          ],
        },
      },
    } as any);

    const searchError = new Error('ES query failed');
    const esClient = {
      openPointInTime: vi.fn().mockResolvedValue({ id: 'pit-0' }),
      search: vi.fn().mockRejectedValue(searchError),
      closePointInTime: vi.fn().mockResolvedValue({ succeeded: true, num_freed: 1 }),
    };

    const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };

    await expect(
      getBenchmarksData(soClient, encryptedSoClient, esClient as any, logger as any)
    ).rejects.toThrow('ES query failed');

    // PIT must be closed regardless of the error.
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-0' });
  });
});
