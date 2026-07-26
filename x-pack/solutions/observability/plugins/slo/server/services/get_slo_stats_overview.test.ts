/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/logging';
import { alertsClientMock } from '@kbn/rule-registry-plugin/server/alert_data_client/alerts_client.mock';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { SLOSettings } from '../domain/models';
import { GetSLOStatsOverview } from './get_slo_stats_overview';

const SETTINGS: SLOSettings = {
  useAllRemoteClusters: false,
  selectedRemoteClusters: [],
  staleThresholdInHours: 48,
  staleInstancesCleanupEnabled: false,
};

const emptyRulesFindResponse = {
  page: 1,
  perPage: 0,
  total: 0,
  data: [],
};

const emptyAlertSummary = {
  activeAlertCount: 0,
  recoveredAlertCount: 0,
  activeAlerts: [],
  recoveredAlerts: [],
};

describe('GetSLOStatsOverview', () => {
  let mockScopedClusterClient: ScopedClusterClientMock;
  let mockRulesClient: jest.Mocked<RulesClientApi>;
  let mockRacClient: ReturnType<typeof alertsClientMock.create>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockRulesClient = rulesClientMock.create();
    mockRacClient = alertsClientMock.create();
    mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

    mockRulesClient.find.mockResolvedValue(emptyRulesFindResponse);
    mockRacClient.getAlertSummary.mockResolvedValue(emptyAlertSummary);
  });

  const buildService = (settings: SLOSettings = SETTINGS) =>
    new GetSLOStatsOverview(
      mockScopedClusterClient,
      'default',
      mockLogger,
      mockRulesClient,
      mockRacClient as unknown as AlertsClient,
      settings
    );

  const mockSearchResponse = (counts: {
    stale?: number;
    not_stale?: {
      total: number;
      violated?: number;
      degrading?: number;
      healthy?: number;
      noData?: number;
    };
  }) => {
    mockScopedClusterClient.asCurrentUser.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        stale: { doc_count: counts.stale ?? 0 },
        not_stale: {
          doc_count: counts.not_stale?.total ?? 0,
          violated: { doc_count: counts.not_stale?.violated ?? 0 },
          degrading: { doc_count: counts.not_stale?.degrading ?? 0 },
          healthy: { doc_count: counts.not_stale?.healthy ?? 0 },
          noData: { doc_count: counts.not_stale?.noData ?? 0 },
        },
      },
    } as never);
  };

  describe('aggregation shape', () => {
    it('routes temp docs to not_stale and excludes them from stale', async () => {
      mockSearchResponse({});

      await buildService().execute({});

      const params = mockScopedClusterClient.asCurrentUser.search.mock.calls[0][0] as {
        aggs: Record<string, unknown>;
      };

      // Source of the bug: the "stale" range alone routed temp docs (summaryUpdatedAt: null)
      // into neither bucket. The fix splits them based on isTempDoc so temp docs always land
      // in not_stale and never in stale, and the per-status counters always see them.
      expect(params.aggs).toEqual({
        stale: {
          filter: {
            bool: {
              filter: [{ range: { summaryUpdatedAt: { lt: 'now-48h' } } }],
              must_not: [{ term: { isTempDoc: true } }],
            },
          },
        },
        not_stale: {
          filter: {
            bool: {
              should: [
                { term: { isTempDoc: true } },
                { range: { summaryUpdatedAt: { gte: 'now-48h' } } },
              ],
              minimum_should_match: 1,
            },
          },
          aggs: {
            violated: { filter: { term: { status: 'VIOLATED' } } },
            healthy: { filter: { term: { status: 'HEALTHY' } } },
            degrading: { filter: { term: { status: 'DEGRADING' } } },
            noData: { filter: { term: { status: 'NO_DATA' } } },
          },
        },
      });
    });

    it('reflects the configured staleThresholdInHours in both buckets', async () => {
      mockSearchResponse({});

      await buildService({ ...SETTINGS, staleThresholdInHours: 12 }).execute({});

      const params = mockScopedClusterClient.asCurrentUser.search.mock.calls[0][0] as {
        aggs: { stale: { filter: { bool: { filter: unknown[] } } }; not_stale: any };
      };

      expect(params.aggs.stale.filter.bool.filter).toEqual([
        { range: { summaryUpdatedAt: { lt: 'now-12h' } } },
      ]);
      expect(params.aggs.not_stale.filter.bool.should).toEqual([
        { term: { isTempDoc: true } },
        { range: { summaryUpdatedAt: { gte: 'now-12h' } } },
      ]);
    });
  });

  describe('counter mapping', () => {
    it('returns the per-status counts from the not_stale sub-aggregations', async () => {
      mockSearchResponse({
        stale: 3,
        not_stale: { total: 10, violated: 1, degrading: 2, healthy: 5, noData: 2 },
      });

      const result = await buildService().execute({});

      expect(result).toEqual({
        violated: 1,
        degrading: 2,
        healthy: 5,
        noData: 2,
        stale: 3,
        burnRateRules: 0,
        burnRateActiveAlerts: 0,
        burnRateRecoveredAlerts: 0,
      });
    });

    it('counts a brand-new SLO with only a temp doc as "noData", not lost in the void', async () => {
      // Regression: a temp doc has summaryUpdatedAt: null and status: NO_DATA.
      // It must end up in not_stale (via the isTempDoc OR clause) and be picked up
      // by the noData sub-agg, matching what the per-row badge displays.
      mockSearchResponse({
        stale: 0,
        not_stale: { total: 1, violated: 0, degrading: 0, healthy: 0, noData: 1 },
      });

      const result = await buildService().execute({});

      expect(result.noData).toBe(1);
      expect(result.stale).toBe(0);
    });

    it('forwards burn-rate rule and alert summary counts', async () => {
      mockSearchResponse({});
      mockRulesClient.find.mockResolvedValueOnce({ ...emptyRulesFindResponse, total: 4 });
      mockRacClient.getAlertSummary.mockResolvedValueOnce({
        ...emptyAlertSummary,
        activeAlertCount: 7,
        recoveredAlertCount: 2,
      });

      const result = await buildService().execute({});

      expect(result.burnRateRules).toBe(4);
      expect(result.burnRateActiveAlerts).toBe(7);
      expect(result.burnRateRecoveredAlerts).toBe(2);
    });
  });
});
