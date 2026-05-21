/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P10 — two-phase Hosts UI API contracts.
//
// Phase A (`/api/metrics/infra/host/list`): cheap. Returns only the ranked,
// page-sliced host name list + total count + alerts count for the visible
// names. No metric sub-aggregations, no metadata enrichment. Bounded to
// `limit ≤ MAX_HOST_COUNT_LIMIT` on the server.
//
// Phase B (`/api/metrics/infra/host/metrics`): heavy, bounded. Returns
// metadata (`host.os.name` / `cloud.provider` / `host.ip`) + metric values
// for the named hosts on the current page.
// `names.length ≤ MAX_HOSTS_PER_METRICS_REQUEST` is enforced server-side.

import { createLiteralValueFromUndefinedRT, inRangeRt, isoToEpochRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { HOSTS_TABLE_DEFAULT_PAGE_SIZE, MAX_HOSTS_PER_METRICS_REQUEST } from '../../constants';
import { EntityTypeRT, DataSchemaFormatRT } from '../shared';
import {
  InfraEntityMetadataRT,
  InfraEntityMetricsRT,
  InfraMetricTypeRT,
} from './get_infra_metrics';

// Sort-by-metric is an explicit subset for the PoC: only fields cheap to
// rank with one extra sub-agg / `*_OVER_TIME` invocation. Sort-by-alerts is
// deliberately omitted (would require joining the alerts index into Phase A
// ranking, which crosses the alertsClient RBAC boundary — falls back to
// client-side sort on the current page).
export const HostsListSortFieldRT = rt.union([rt.literal('host.name'), InfraMetricTypeRT]);

export const HostsListSortDirectionRT = rt.union([rt.literal('asc'), rt.literal('desc')]);

export const HostsListSortRT = rt.type({
  field: HostsListSortFieldRT,
  direction: HostsListSortDirectionRT,
});

export const HostsListPageRT = rt.type({
  // `from` is a row offset (not a page index) to match EUI table conventions
  // and to keep client-side math trivial.
  from: rt.union([inRangeRt(0, 10000), createLiteralValueFromUndefinedRT(0)]),
  // `size` is capped at the largest UI page-size option
  // (`MAX_HOSTS_PER_METRICS_REQUEST`, derived from
  // `HOSTS_TABLE_PAGE_SIZE_OPTIONS`) and defaults to the same value the UI
  // initialises with (`HOSTS_TABLE_DEFAULT_PAGE_SIZE`) so a client that
  // doesn't pass `page.size` gets the same page size the UI uses.
  size: rt.union([
    inRangeRt(1, MAX_HOSTS_PER_METRICS_REQUEST),
    createLiteralValueFromUndefinedRT(HOSTS_TABLE_DEFAULT_PAGE_SIZE),
  ]),
});

export const GetHostsListRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
    schema: DataSchemaFormatRT,
    sort: HostsListSortRT,
    page: HostsListPageRT,
  }),
  rt.type({
    // Phase A's `limit` is the total addressable fleet cap, not the number
    // of rows returned. Defaults to 500 for backwards compatibility with the
    // existing `HOST_LIMIT_OPTIONS` UI; can be raised to MAX_HOST_COUNT_LIMIT
    // (10 000) once the UI selector is migrated.
    limit: rt.union([inRangeRt(1, 10000), createLiteralValueFromUndefinedRT(500)]),
    from: isoToEpochRt,
    to: isoToEpochRt,
  }),
]);

export const HostsListItemRT = rt.intersection([
  rt.type({
    name: rt.string,
  }),
  rt.partial({
    alertsCount: rt.number,
  }),
]);

export const GetHostsListResponsePayloadRT = rt.intersection([
  EntityTypeRT,
  rt.type({
    nodes: rt.array(HostsListItemRT),
    totalHosts: rt.number,
  }),
]);

// Phase B — `names.length` IS the page size. The server does exactly
// `names.length` hosts of work; a client picking 5 rows/page sends 5
// names, a client picking 20 sends 20. The route validator enforces
// `names.length ≤ MAX_HOSTS_PER_METRICS_REQUEST` as a hard upper bound.
export const GetHostsMetricsRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
    schema: DataSchemaFormatRT,
  }),
  rt.type({
    // Exactly the visible page's host names. Server caps at
    // `MAX_HOSTS_PER_METRICS_REQUEST`; the route validator rejects
    // anything longer.
    names: rt.array(rt.string),
    metrics: rt.array(InfraMetricTypeRT),
    from: isoToEpochRt,
    to: isoToEpochRt,
  }),
]);

export const HostsMetricsItemRT = rt.type({
  name: rt.string,
  metrics: rt.array(InfraEntityMetricsRT),
  metadata: rt.array(InfraEntityMetadataRT),
  hasSystemMetrics: rt.boolean,
});

export const GetHostsMetricsResponsePayloadRT = rt.intersection([
  EntityTypeRT,
  rt.type({
    nodes: rt.array(HostsMetricsItemRT),
  }),
]);

export type GetHostsListRequestBodyPayload = rt.TypeOf<typeof GetHostsListRequestBodyPayloadRT>;
// Encoded shape sent over the wire by the client (ISO `from`/`to` strings).
export type GetHostsListRequestBodyPayloadClient = rt.OutputOf<
  typeof GetHostsListRequestBodyPayloadRT
>;
export type GetHostsListResponsePayload = rt.TypeOf<typeof GetHostsListResponsePayloadRT>;
export type HostsListItem = rt.TypeOf<typeof HostsListItemRT>;
export type HostsListSort = rt.TypeOf<typeof HostsListSortRT>;
export type HostsListSortField = rt.TypeOf<typeof HostsListSortFieldRT>;
export type HostsListSortDirection = rt.TypeOf<typeof HostsListSortDirectionRT>;
export type HostsListPage = rt.TypeOf<typeof HostsListPageRT>;

export type GetHostsMetricsRequestBodyPayload = rt.TypeOf<
  typeof GetHostsMetricsRequestBodyPayloadRT
>;
export type GetHostsMetricsRequestBodyPayloadClient = rt.OutputOf<
  typeof GetHostsMetricsRequestBodyPayloadRT
>;
export type GetHostsMetricsResponsePayload = rt.TypeOf<typeof GetHostsMetricsResponsePayloadRT>;
export type HostsMetricsItem = rt.TypeOf<typeof HostsMetricsItemRT>;
