/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { stateSchemaByVersion } from './task_state';
import { getVulnStatsTrendDocIndexingPromises } from './findings_stats_task';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

const esClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;

describe('finding stats task state', () => {
  describe('v1', () => {
    const v1 = stateSchemaByVersion[1];
    it('should work on empty object when running the up migration', () => {
      const result = v1.up({});
      expect(result).toMatchInlineSnapshot(`
        Object {
          "health_status": "ok",
          "runs": 0,
        }
      `);
    });

    it(`shouldn't overwrite properties when running the up migration`, () => {
      const state = {
        health_status: 'error',
        runs: 1,
      };
      const result = v1.up(cloneDeep(state));
      expect(result).toEqual(state);
    });

    it('should drop unknown properties when running the up migration', () => {
      const state = { foo: true };
      const result = v1.up(state);
      expect(result).not.toHaveProperty('foo');
    });

    it('should return undefined if vulnStatsAggs is not provided', () => {
      const result = getVulnStatsTrendDocIndexingPromises(esClient);
      expect(result).toBeUndefined();
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('should correctly process vulnerability stats and call esClient.index', async () => {
      const vulnStatsAggs = {
        vulnerabilities_stats_by_cloud_account: {
          buckets: [
            {
              key: 'account1',
              cloud_account_name: { buckets: [{ key: 'Account One' }] },
              critical: { doc_count: 5 },
              high: { doc_count: 10 },
              medium: { doc_count: 15 },
              low: { doc_count: 20 },
            },
          ],
        },
        critical: { doc_count: 50 },
        high: { doc_count: 100 },
        medium: { doc_count: 150 },
        low: { doc_count: 200 },
      };

      await getVulnStatsTrendDocIndexingPromises(esClient, vulnStatsAggs);

      expect(esClient.index).toHaveBeenCalledWith({
        index: expect.any(String),
        document: expect.objectContaining({
          vulnerabilities_stats_by_cloud_account: {
            account1: expect.objectContaining({
              cloudAccountName: 'Account One',
              critical: 5,
              high: 10,
              medium: 15,
              low: 20,
            }),
          },
        }),
      });
    });

    it('should handle missing cloud account name gracefully', async () => {
      const vulnStatsAggs = {
        vulnerabilities_stats_by_cloud_account: {
          buckets: [
            {
              key: 'account2',
              cloud_account_name: { buckets: [] },
              critical: { doc_count: 3 },
              high: { doc_count: 6 },
              medium: { doc_count: 9 },
              low: { doc_count: 12 },
            },
          ],
        },
        critical: { doc_count: 30 },
        high: { doc_count: 60 },
        medium: { doc_count: 90 },
        low: { doc_count: 120 },
      };

      await getVulnStatsTrendDocIndexingPromises(esClient, vulnStatsAggs);

      expect(esClient.index).toHaveBeenCalledWith({
        index: expect.any(String),
        document: expect.objectContaining({
          vulnerabilities_stats_by_cloud_account: {
            account2: expect.objectContaining({
              cloudAccountName: '',
            }),
          },
        }),
      });
    });
  });
});
