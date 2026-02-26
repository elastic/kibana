/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getBenchmarksData } from './v2';

jest.mock('../benchmark_rules/get_states/v1', () => ({
  getMutedRulesFilterQuery: jest.fn().mockResolvedValue([]),
}));

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
      openPointInTime: jest.fn().mockResolvedValue({ id: 'pit-0' }),
      search: jest
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
          aggregations: { aggs_by_asset_identifier: { buckets: [] } },
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
          aggregations: { aggs_by_asset_identifier: { buckets: [] } },
        }),
      closePointInTime: jest.fn().mockResolvedValue({ succeeded: true, num_freed: 1 }),
    };

    const logger = { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() };

    await getBenchmarksData(soClient, encryptedSoClient, esClient as any, logger as any);

    expect(esClient.search.mock.calls[0][0].pit.id).toBe('pit-0');
    expect(esClient.search.mock.calls[1][0].pit.id).toBe('pit-1');
    expect(esClient.search.mock.calls[2][0].pit.id).toBe('pit-2');
    expect(esClient.search.mock.calls[3][0].pit.id).toBe('pit-3');
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-4' });
  });
});
