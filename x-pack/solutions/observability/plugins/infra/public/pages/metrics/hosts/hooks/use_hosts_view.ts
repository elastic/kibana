/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P10 — two-phase Hosts UI client orchestrator.
//
// Phase A: `/api/metrics/infra/host/list`
//   Returns the ranked, page-sliced host name list + alerts count for the
//   visible page. Cheap. Driven by URL state for sort + pagination.
//
// Phase B: `/api/metrics/infra/host/metrics`
//   Returns metadata + metric values for the page's host names. Heavy but
//   bounded to ≤ 20 buckets. Fires after Phase A resolves with the page's
//   names; aborts (via `useFetcher`) when the page changes mid-flight.
//
// The merged shape returned by this hook (`hostNodes: InfraEntityMetricsItem[]`)
// is byte-for-byte compatible with the legacy single-endpoint shape so
// `useHostsTable` / `HostsTable` keep working unmodified for the cells
// themselves. Metric cells show "–" while Phase B is in flight.

import createContainer from 'constate';
import { useMemo } from 'react';
import type { BoolQuery } from '@kbn/es-query';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { DEFAULT_SCHEMA, HOSTS_TABLE_DEFAULT_PAGE_SIZE } from '../../../../../common/constants';
import { FETCH_STATUS, isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useUnifiedSearchContext } from './use_unified_search';
import { useHostsTableUrlState } from './use_hosts_table_url_state';
import { usePocSettingsContext } from './use_poc_settings';
import type {
  GetHostsListRequestBodyPayloadClient,
  GetHostsListResponsePayload,
  GetHostsMetricsRequestBodyPayloadClient,
  GetHostsMetricsResponsePayload,
  GetInfraMetricsRequestBodyPayloadClient,
  GetInfraMetricsResponsePayload,
  HostsListSort,
  InfraEntityMetricsItem,
  InfraEntityMetricType,
} from '../../../../../common/http_api';
import {
  GetHostsListResponsePayloadRT,
  GetHostsMetricsResponsePayloadRT,
} from '../../../../../common/http_api';
import type { StringDateRange } from './use_unified_search_url_state';

const COMMON_HOST_METRICS: InfraEntityMetricType[] = [
  'cpuV2',
  'diskSpaceUsage',
  'memory',
  'memoryFree',
  'normalizedLoad1m',
];
const HOST_TABLE_METRICS: InfraEntityMetricType[] = [...COMMON_HOST_METRICS, 'rxV2', 'txV2'];
const OTEL_HOSTS_TABLE_METRICS: InfraEntityMetricType[] = [...COMMON_HOST_METRICS];

const LIST_PATH = '/api/metrics/infra/host/list';
const METRICS_PATH = '/api/metrics/infra/host/metrics';
const LEGACY_PATH = '/api/metrics/infra/host';

// Field names from `useHostsTableUrlState` that map cleanly to Phase A's
// sort union. `alertsCount` / `title` aren't valid server-side sort fields
// — we fall back to `host.name` ranking and apply a client-side post-sort on
// the current page so the visible order still respects the user's intent
// for the rows we already have.
const SERVER_SORT_FIELDS = new Set<string>([
  'host.name',
  'cpuV2',
  'normalizedLoad1m',
  'memory',
  'memoryFree',
  'diskSpaceUsage',
  'rxV2',
  'txV2',
]);

type TwoPhaseHostNode = InfraEntityMetricsItem;

export const useHostsView = () => {
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();
  const { buildQuery, isReady, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const [{ sorting, pagination }] = useHostsTableUrlState();
  // P10 — `useTwoPhaseFetch` controls whether the page issues Phase A +
  // Phase B against the new endpoints or falls back to the legacy single
  // `/api/metrics/infra/host` call. Renamed from `useNewTable` so each
  // proposal has its own switch.
  const { useTwoPhaseFetch: useNewTable } = usePocSettingsContext();

  const schema = searchCriteria?.preferredSchema || DEFAULT_SCHEMA;
  const metrics = schema === 'semconv' ? OTEL_HOSTS_TABLE_METRICS : HOST_TABLE_METRICS;

  // ---------------------------------------------------------------------
  // Phase A — names + alerts for the visible page.
  // ---------------------------------------------------------------------

  const phaseASort: HostsListSort = useMemo(() => {
    const direction = sorting.direction ?? 'asc';
    if (sorting.field && SERVER_SORT_FIELDS.has(sorting.field)) {
      return {
        field: sorting.field as HostsListSort['field'],
        direction,
      };
    }
    // `alertsCount`, `title`, anything else — Phase A ranks lexicographically
    // by host name and the table component re-sorts the visible page.
    return { field: 'host.name', direction };
  }, [sorting.field, sorting.direction]);

  // `pageSize` here is the EuiBasicTable "rows per page" choice (5 / 10 /
  // 20 today). It flows verbatim into Phase A's `page.size`, which slices
  // the ranked fleet down to exactly that many names; those names then go
  // into Phase B's `names` array, which is what drives query cost there.
  // No part of this pipeline assumes a 20-host floor — picking 5 yields
  // 5-host Phase B work.
  const pageSize = pagination.pageSize ?? HOSTS_TABLE_DEFAULT_PAGE_SIZE;
  const pageIndex = pagination.pageIndex ?? 0;

  const listPayload = useMemo<string>(
    () =>
      JSON.stringify(
        buildListRequest({
          dateRange: parsedDateRange,
          esQuery: buildQuery(),
          limit: searchCriteria.limit,
          schema,
          sort: phaseASort,
          from: pageIndex * pageSize,
          size: pageSize,
        })
      ),
    [buildQuery, parsedDateRange, searchCriteria.limit, schema, phaseASort, pageIndex, pageSize]
  );

  const {
    data: listData,
    error: listError,
    status: listStatus,
  } = useFetcher(
    // P5.5 — return `undefined` synchronously while prerequisites aren't
    // ready so `useFetcher` doesn't fire the throwaway initial request.
    // PoC gear toggle — when "Use new Hosts table" is off, the legacy
    // fetcher below owns the data and Phase A/B stay idle.
    (callApi) => {
      if (!isReady || !useNewTable) return;
      return (async () => {
        const start = performance.now();
        const response = await callApi(LIST_PATH, {
          method: 'POST',
          body: listPayload,
        });
        const duration = performance.now() - start;
        telemetry.reportPerformanceMetricEvent(
          'infra_hosts_table_load_phase_a',
          duration,
          { key1: 'data_load', value1: duration },
          { limit: searchCriteria.limit }
        );
        return decodeOrThrow(GetHostsListResponsePayloadRT)(
          response as GetHostsListResponsePayload
        );
      })();
    },
    [isReady, useNewTable, listPayload, searchCriteria.limit, telemetry]
  );

  const pageNames = useMemo(() => (listData?.nodes ?? []).map((n) => n.name), [listData?.nodes]);

  // ---------------------------------------------------------------------
  // Phase B — metadata + metrics for the page's names.
  // ---------------------------------------------------------------------

  const metricsPayload = useMemo<string>(
    () =>
      JSON.stringify(
        buildMetricsRequest({
          dateRange: parsedDateRange,
          esQuery: buildQuery(),
          names: pageNames,
          metrics,
          schema,
        })
      ),
    [parsedDateRange, buildQuery, pageNames, metrics, schema]
  );

  const {
    data: metricsData,
    error: metricsError,
    status: metricsStatus,
  } = useFetcher(
    (callApi) => {
      if (!isReady || !useNewTable) return;
      if (pageNames.length === 0) return;
      return (async () => {
        const start = performance.now();
        const response = await callApi(METRICS_PATH, {
          method: 'POST',
          body: metricsPayload,
        });
        const duration = performance.now() - start;
        telemetry.reportPerformanceMetricEvent(
          'infra_hosts_table_load_phase_b',
          duration,
          { key1: 'data_load', value1: duration },
          { limit: pageNames.length }
        );
        return decodeOrThrow(GetHostsMetricsResponsePayloadRT)(
          response as GetHostsMetricsResponsePayload
        );
      })();
    },
    [isReady, useNewTable, pageNames, metricsPayload, telemetry]
  );

  // ---------------------------------------------------------------------
  // Legacy single-endpoint fallback (PoC gear toggle: "Use new Hosts table"
  // OFF). Fetches the full host set + metrics + metadata + alerts in one
  // shot, matching the pre-Tier-3 behaviour. Sort + pagination are then
  // applied client-side in `useHostsTable`.
  // ---------------------------------------------------------------------

  const legacyPayload = useMemo<string>(
    () =>
      JSON.stringify(
        buildLegacyRequest({
          dateRange: parsedDateRange,
          esQuery: buildQuery(),
          limit: searchCriteria.limit,
          metrics,
          schema,
        })
      ),
    [buildQuery, parsedDateRange, searchCriteria.limit, metrics, schema]
  );

  const {
    data: legacyData,
    error: legacyError,
    status: legacyStatus,
  } = useFetcher(
    (callApi) => {
      if (!isReady || useNewTable) return;
      return (async () => {
        const start = performance.now();
        const response = await callApi<GetInfraMetricsResponsePayload>(LEGACY_PATH, {
          method: 'POST',
          body: legacyPayload,
        });
        const duration = performance.now() - start;
        telemetry.reportPerformanceMetricEvent(
          'infra_hosts_table_load',
          duration,
          { key1: 'data_load', value1: duration },
          { limit: searchCriteria.limit }
        );
        return response;
      })();
    },
    [isReady, useNewTable, legacyPayload, searchCriteria.limit, telemetry]
  );

  // ---------------------------------------------------------------------
  // Merge — preserve Phase A's row order, fill metric/metadata cells from
  // Phase B when available, else emit empty placeholders so the table
  // still renders the rows with skeleton cells.
  // ---------------------------------------------------------------------

  const hostNodes: TwoPhaseHostNode[] = useMemo(() => {
    if (!useNewTable) {
      return legacyData?.nodes ?? [];
    }

    const listNodes = listData?.nodes ?? [];
    if (listNodes.length === 0) return [];

    type MetricsNode = NonNullable<typeof metricsData>['nodes'][number];
    const metricsByName = new Map<string, MetricsNode>();
    for (const node of metricsData?.nodes ?? []) {
      metricsByName.set(node.name, node);
    }

    return listNodes.map((listNode) => {
      const m = metricsByName.get(listNode.name);
      const node: TwoPhaseHostNode = {
        name: listNode.name,
        metrics: m?.metrics ?? metrics.map((name) => ({ name, value: null })),
        metadata: m?.metadata ?? [
          { name: 'host.os.name', value: null },
          { name: 'cloud.provider', value: null },
          { name: 'host.ip', value: null },
        ],
        hasSystemMetrics: m?.hasSystemMetrics ?? true,
      };
      if (listNode.alertsCount !== undefined) {
        node.alertsCount = listNode.alertsCount;
      }
      return node;
    });
  }, [useNewTable, legacyData?.nodes, listData?.nodes, metricsData?.nodes, metrics]);

  // Two-phase: Phase A returns the ranked fleet count so pagination math
  // doesn't depend on the page's length. Legacy: the table client-paginates
  // over what the endpoint returned, so totalHosts is the response length.
  const totalHosts = useNewTable ? listData?.totalHosts ?? 0 : legacyData?.nodes?.length ?? 0;

  if (!useNewTable) {
    return {
      loading: isPending(legacyStatus),
      phaseBLoading: false,
      error: legacyError ?? undefined,
      hostNodes,
      totalHosts,
      phaseAStatus: legacyStatus,
      phaseBStatus: legacyStatus,
      isPhaseAReady: legacyStatus === FETCH_STATUS.SUCCESS,
    };
  }

  return {
    // Phase A drives the loading state. Phase B's loading is hidden because
    // the row exists from Phase A; cells render with nulls (skeleton) until
    // Phase B resolves and they swap in.
    loading: isPending(listStatus),
    phaseBLoading: isPending(metricsStatus),
    error: listError ?? metricsError ?? undefined,
    hostNodes,
    totalHosts,
    phaseAStatus: listStatus,
    phaseBStatus: metricsStatus,
    isPhaseAReady: listStatus === FETCH_STATUS.SUCCESS,
  };
};

export const HostsView = createContainer(useHostsView);
export const [HostsViewProvider, useHostsViewContext] = HostsView;

// ---------------------------------------------------------------------------
// Request builders
// ---------------------------------------------------------------------------

function buildListRequest({
  esQuery,
  dateRange,
  limit,
  schema,
  sort,
  from,
  size,
}: {
  esQuery: { bool: BoolQuery };
  dateRange: StringDateRange;
  limit: number;
  schema?: DataSchemaFormat;
  sort: HostsListSort;
  from: number;
  size: number;
}): GetHostsListRequestBodyPayloadClient {
  return {
    query: esQuery,
    from: dateRange.from,
    to: dateRange.to,
    limit,
    schema,
    sort,
    page: { from, size },
  };
}

function buildMetricsRequest({
  esQuery,
  dateRange,
  names,
  metrics,
  schema,
}: {
  esQuery: { bool: BoolQuery };
  dateRange: StringDateRange;
  names: string[];
  metrics: InfraEntityMetricType[];
  schema?: DataSchemaFormat;
}): GetHostsMetricsRequestBodyPayloadClient {
  return {
    query: esQuery,
    from: dateRange.from,
    to: dateRange.to,
    names,
    metrics,
    schema,
  };
}

// PoC-only — payload for the pre-Tier-3 single-endpoint flow used when the
// "Use new Hosts table" toggle is off.
function buildLegacyRequest({
  esQuery,
  dateRange,
  limit,
  metrics,
  schema,
}: {
  esQuery: { bool: BoolQuery };
  dateRange: StringDateRange;
  limit: number;
  metrics: InfraEntityMetricType[];
  schema?: DataSchemaFormat;
}): GetInfraMetricsRequestBodyPayloadClient {
  return {
    query: esQuery,
    from: dateRange.from,
    to: dateRange.to,
    metrics,
    limit,
    schema,
  };
}
