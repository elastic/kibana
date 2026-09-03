/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { makeUpSummary } from '@kbn/observability-synthetics-test-data';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { getOverviewConfigKey } from '../../../../../common/lib/overview_config_key';
import type { ScoutPrivateLocation } from '../../../common/services/synthetics_private_location_api_service';
import {
  apiTest,
  mergeSyntheticsApiHeaders,
  SYNTHETICS_API_URLS,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../common/fixtures';
import { enableSynthetics, saveMonitorInternal } from '../../../common/fixtures/monitors';

const HTTP_DATA_STREAM = 'synthetics-http-default';
const PER_PAGE = 3;

interface OverviewLocation {
  id: string;
  label: string;
  status: string;
}

interface OverviewConfig {
  configId: string;
  name: string;
  overallStatus: string;
  origin?: 'heartbeat';
  remote?: { remoteName: string };
  locations: OverviewLocation[];
}

interface OverviewStatusBody {
  allMonitorsCount: number;
  disabledMonitorsCount: number;
  up: number;
  down: number;
  pending: number;
  stale: number;
  disabledCount: number;
  upConfigs: Record<string, OverviewConfig>;
  downConfigs: Record<string, OverviewConfig>;
  pendingConfigs: Record<string, OverviewConfig>;
  staleConfigs: Record<string, OverviewConfig>;
  disabledConfigs: Record<string, OverviewConfig>;
  configs?: OverviewConfig[];
  total?: number;
  page?: number;
  perPage?: number;
}

interface OverviewStalePriorRun {
  monitorQueryId: string;
  locationId: string;
  timestamp: string;
  status: string;
}

interface OverviewStaleBody {
  priorRuns: OverviewStalePriorRun[];
}

const toQuery = (params: Record<string, string | number | boolean | undefined>) => {
  const qs = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return qs ? `?${qs}` : '';
};

const pageBucketKeys = (body: OverviewStatusBody) => [
  ...Object.keys(body.upConfigs),
  ...Object.keys(body.downConfigs),
  ...Object.keys(body.pendingConfigs),
  ...Object.keys(body.staleConfigs ?? {}),
  ...Object.keys(body.disabledConfigs),
];

/**
 * HTTP contract for `GET /internal/synthetics/overview_status` pagination.
 *
 * CCS/CPS uniqueness is covered in Jest (`getOverviewConfigKey` + `paginateConfigs`)
 * because Scout has no remote cluster. This suite covers the live HTTP contract
 * for local saved-object pages and Heartbeat rows (same collision class: one
 * `configId`, two locations).
 */
apiTest.describe(
  'getOverviewStatus',
  {
    tag: ['@local-stateful-classic', '@local-serverless-observability_complete'],
  },
  () => {
    let editorHeaders: Record<string, string>;
    let firstLocation: ScoutPrivateLocation;
    let secondLocation: ScoutPrivateLocation;
    const runId = uuidv4();
    const runTag = `ov-status-${runId}`;
    const heartbeatTag = `ov-hb-${runId}`;
    const names = {
      alpha: `Alpha ${runId}`,
      bravo: `Bravo ${runId}`,
      charlie: `Charlie ${runId}`,
      delta: `Delta ${runId}`,
      echo: `Echo ${runId}`,
      foxtrot: `Foxtrot ${runId}`,
      golf: `Golf ${runId}`,
    };
    const enabledNames = [names.alpha, names.bravo, names.charlie, names.delta, names.echo];
    let firstMonitorId: string;

    const listParams = (extra: Record<string, string | number | boolean | undefined> = {}) => ({
      tags: runTag,
      dateRangeStart: 'now-1h',
      dateRangeEnd: 'now',
      sortField: 'name.keyword',
      sortOrder: 'asc',
      ...extra,
    });

    const getOverviewStatus = async (
      apiClient: ApiClientFixture,
      params: Record<string, string | number | boolean | undefined> = {},
      opts: { statusCode?: number } = {}
    ) => {
      const { statusCode = 200 } = opts;
      const res = await apiClient.get(`${SYNTHETICS_API_URLS.OVERVIEW_STATUS}${toQuery(params)}`, {
        headers: editorHeaders,
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(statusCode);
      return res;
    };

    apiTest.beforeAll(async ({ requestAuth, apiClient, apiServices, kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      const { apiKeyHeader } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader, { Accept: 'application/json' });
      await enableSynthetics(apiClient, editorHeaders);

      firstLocation = await apiServices.syntheticsPrivateLocations.getSharedPrivateLocation();
      secondLocation = await apiServices.syntheticsPrivateLocations.addTestPrivateLocation();

      const common = { type: 'http', url: 'https://www.elastic.co', tags: [runTag] };
      const savedIds: string[] = [];
      for (const name of enabledNames) {
        const res = await saveMonitorInternal(apiClient, editorHeaders, {
          ...common,
          name,
          locations: [firstLocation],
        });
        savedIds.push((res.body as { id: string }).id);
      }
      firstMonitorId = savedIds[0];

      await saveMonitorInternal(apiClient, editorHeaders, {
        ...common,
        name: names.foxtrot,
        enabled: false,
        locations: [firstLocation],
      });
      await saveMonitorInternal(apiClient, editorHeaders, {
        ...common,
        name: names.golf,
        locations: [firstLocation, secondLocation],
      });
    });

    apiTest.afterAll(async ({ kbnClient, esClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      await esClient.deleteByQuery({
        index: `${HTTP_DATA_STREAM}*`,
        query: { term: { tags: heartbeatTag } },
        conflicts: 'proceed',
        refresh: true,
        ignore_unavailable: true,
      });
    });

    apiTest('omits page fields when page and perPage are not both sent', async ({ apiClient }) => {
      const res = await getOverviewStatus(apiClient, listParams());
      const body = res.body as OverviewStatusBody;

      expect(body.configs).toBeUndefined();
      expect(body.total).toBeUndefined();
      expect(body.page).toBeUndefined();
      expect(body.perPage).toBeUndefined();
      expect(body.allMonitorsCount).toBe(7);
      expect(body.disabledMonitorsCount).toBe(1);
      expect(body.pending).toBe(6);
    });

    apiTest('returns a page of configs and keeps fleet-wide counts', async ({ apiClient }) => {
      const res = await getOverviewStatus(apiClient, listParams({ page: 1, perPage: PER_PAGE }));
      const body = res.body as OverviewStatusBody;

      expect(body.page).toBe(1);
      expect(body.perPage).toBe(PER_PAGE);
      expect(body.total).toBe(7);
      expect(body.allMonitorsCount).toBe(7);
      expect(body.pending).toBe(6);
      expect(body.configs).toHaveLength(PER_PAGE);
      expect(body.configs!.map((config) => config.name)).toStrictEqual([
        names.alpha,
        names.bravo,
        names.charlie,
      ]);
      expect(Object.keys(body.pendingConfigs)).toHaveLength(PER_PAGE);
      expect(Object.keys(body.disabledConfigs)).toHaveLength(0);

      const keys = pageBucketKeys(body);
      expect(keys).toHaveLength(PER_PAGE);
      expect(new Set(keys).size).toBe(PER_PAGE);
      expect(keys.sort()).toStrictEqual(body.configs!.map(getOverviewConfigKey).sort());
    });

    apiTest('page slices are disjoint and cover every config', async ({ apiClient }) => {
      const pages = await Promise.all(
        [1, 2, 3].map(async (page) => {
          const res = await getOverviewStatus(apiClient, listParams({ page, perPage: PER_PAGE }));
          return res.body as OverviewStatusBody;
        })
      );

      expect(pages.map((page) => page.total)).toStrictEqual([7, 7, 7]);
      expect(pages[0].configs).toHaveLength(3);
      expect(pages[1].configs).toHaveLength(3);
      expect(pages[2].configs).toHaveLength(1);
      expect(pages[2].configs![0].name).toBe(names.golf);
      expect(pages[2].configs![0].locations).toHaveLength(2);

      const namesOnPages = pages.flatMap((page) => page.configs!.map((config) => config.name));
      expect(namesOnPages).toStrictEqual([
        names.alpha,
        names.bravo,
        names.charlie,
        names.delta,
        names.echo,
        names.foxtrot,
        names.golf,
      ]);
      expect(new Set(namesOnPages).size).toBe(7);

      const firstIds = new Set(pages[0].configs!.map((config) => config.configId));
      expect(pages[1].configs!.some((config) => firstIds.has(config.configId))).toBe(false);
    });

    apiTest('statusFilter paginates a single bucket', async ({ apiClient }) => {
      const pending = await getOverviewStatus(
        apiClient,
        listParams({ page: 1, perPage: 20, statusFilter: 'pending' })
      );
      const pendingBody = pending.body as OverviewStatusBody;
      expect(pendingBody.total).toBe(6);
      expect(pendingBody.configs).toHaveLength(6);
      expect(pendingBody.configs!.every((config) => config.overallStatus === 'pending')).toBe(true);

      const disabled = await getOverviewStatus(
        apiClient,
        listParams({ page: 1, perPage: 20, statusFilter: 'disabled' })
      );
      const disabledBody = disabled.body as OverviewStatusBody;
      expect(disabledBody.total).toBe(1);
      expect(disabledBody.configs![0].name).toBe(names.foxtrot);
      expect(disabledBody.configs![0].overallStatus).toBe('disabled');
    });

    apiTest('query narrows the page to a matching monitor name', async ({ apiClient }) => {
      const res = await getOverviewStatus(
        apiClient,
        listParams({ page: 1, perPage: 20, query: `"${names.alpha}"` })
      );
      const body = res.body as OverviewStatusBody;
      expect(body.total).toBe(1);
      expect(body.configs![0].name).toBe(names.alpha);
    });

    apiTest('rejects out-of-range page and perPage', async ({ apiClient }) => {
      await getOverviewStatus(apiClient, listParams({ page: 0, perPage: 3 }), { statusCode: 400 });
      await getOverviewStatus(apiClient, listParams({ page: 1, perPage: 501 }), {
        statusCode: 400,
      });
    });

    apiTest('stale lookup returns no prior runs for a never-run monitor', async ({ apiClient }) => {
      const res = await apiClient.post(
        `${SYNTHETICS_API_URLS.OVERVIEW_STATUS_STALE}${toQuery({
          dateRangeStart: 'now-1h',
          dateRangeEnd: 'now',
        })}`,
        {
          headers: editorHeaders,
          body: { monitorQueryIds: [firstMonitorId] },
          responseType: 'json',
        }
      );
      expect(res).toHaveStatusCode(200);
      const body = res.body as OverviewStaleBody;
      expect(Array.isArray(body.priorRuns)).toBe(true);
      expect(body.priorRuns).toHaveLength(0);
    });

    apiTest(
      'keeps two Heartbeat locations that share configId as distinct page rows',
      async ({ apiClient, esClient }) => {
        const heartbeatId = `hb-${runId}`;
        const heartbeatName = `Heartbeat ${runId}`;
        const timestamp = new Date().toISOString();

        const indexHeartbeatPing = async (location: { id: string; label: string }) => {
          const document = makeUpSummary({
            monitorId: heartbeatId,
            name: heartbeatName,
            timestamp,
            location,
          }) as Record<string, unknown>;
          // Autodiscovery pings have neither Kibana provenance marker.
          delete document.config_id;
          delete document.meta;
          document.tags = [heartbeatTag];
          await esClient.index({ index: HTTP_DATA_STREAM, document, refresh: 'wait_for' });
        };

        await indexHeartbeatPing({ id: 'hb-east', label: 'HB East' });
        await indexHeartbeatPing({ id: 'hb-west', label: 'HB West' });

        const included = await getOverviewStatus(apiClient, {
          tags: heartbeatTag,
          dateRangeStart: 'now-1h',
          dateRangeEnd: 'now',
          page: 1,
          perPage: 20,
        });
        const includedBody = included.body as OverviewStatusBody;
        expect(includedBody.total).toBe(2);
        expect(includedBody.configs).toHaveLength(2);
        expect(includedBody.configs!.every((config) => config.origin === 'heartbeat')).toBe(true);
        expect(pageBucketKeys(includedBody).sort()).toStrictEqual(
          [`heartbeat-${heartbeatId}-hb-east`, `heartbeat-${heartbeatId}-hb-west`].sort()
        );

        const excluded = await getOverviewStatus(apiClient, {
          tags: heartbeatTag,
          dateRangeStart: 'now-1h',
          dateRangeEnd: 'now',
          page: 1,
          perPage: 20,
          includeHeartbeatMonitors: false,
        });
        const excludedBody = excluded.body as OverviewStatusBody;
        expect(excludedBody.total).toBe(0);
        expect(excludedBody.configs).toHaveLength(0);
      }
    );
  }
);
