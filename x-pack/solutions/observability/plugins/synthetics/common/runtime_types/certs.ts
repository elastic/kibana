/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { remoteMonitorInfoSchema } from './remote';

export const GetCertsParamsType = t.partial({
  pageIndex: t.number,
  search: t.string,
  notValidBefore: t.string,
  notValidAfter: t.string,
  from: t.string,
  to: t.string,
  sortBy: t.string,
  direction: t.string,
  size: t.number,
  filters: t.unknown,
  monitorIds: t.array(t.string),
  monitorTypes: t.array(t.string),
  browserResourceTypes: t.array(t.string),
  party: t.array(t.string),
  tags: t.array(t.string),
  issuers: t.array(t.string),
  includeBrowserCerts: t.boolean,
  // Cluster aliases to scope the cert query to one or more remote (CCS)
  // clusters. Honoured by the certificates routes only when CCS is enabled —
  // it adds an `_index: "<alias>:*"` filter on remote pings, while local pings
  // remain visible regardless. An empty/absent value means "all configured
  // clusters" (local + every remote alias the route wrapper expanded into).
  remoteNames: t.array(t.string),
});

export type GetCertsParams = t.TypeOf<typeof GetCertsParamsType>;

export const CertMonitorType = t.partial({
  name: t.string,
  id: t.string,
  configId: t.string,
  url: t.string,
  type: t.string,
  // Set when the monitor's ping was read from a remote (CCS) cluster, so the
  // UI can badge it and link out to the originating Kibana when known.
  remote: remoteMonitorInfoSchema,
});

export const CertType = t.intersection([
  t.type({
    monitors: t.array(CertMonitorType),
    configId: t.string,
    monitorName: t.string,
    monitorId: t.string,
    monitorType: t.string,
    locationId: t.string,
    locationName: t.string,
    '@timestamp': t.string,
  }),
  t.partial({
    not_after: t.string,
    not_before: t.string,
    common_name: t.string,
    issuer: t.string,
    // Browser monitor network events do not index a TLS fingerprint, so sha256
    // (and sha1) are only present for lightweight HTTP/TCP certificates.
    sha256: t.string,
    sha1: t.string,
    monitorUrl: t.string,
    hostName: t.string,
    serviceName: t.string,
    errorMessage: t.string,
    errorStackTrace: t.union([t.string, t.null]),
    labels: t.record(t.string, t.string),
    tags: t.array(t.string),
    monitorTags: t.array(t.string),
    // Set when the cert's representative ping (the collapse representative)
    // came from a remote (CCS) cluster. The per-monitor `remote` field on
    // entries in `monitors` is what's used to drive deep links — this one is
    // a hint for row-level affordances.
    remote: remoteMonitorInfoSchema,
  }),
]);

export const CertResultType = t.type({
  certs: t.array(CertType),
  total: t.number,
});

// Global distinct-cert counts per quick-filter value, used to show counts next to
// the certificates page filter options (independent of the active selection).
export const CertFacetCountType = t.type({
  value: t.string,
  count: t.number,
});

export const CertFacetsType = t.type({
  monitorTypes: t.array(CertFacetCountType),
  tags: t.array(CertFacetCountType),
  issuers: t.array(CertFacetCountType),
  resourceTypes: t.array(CertFacetCountType),
  party: t.array(CertFacetCountType),
  expiringWithin: t.array(CertFacetCountType),
});

export type CertFacetCount = t.TypeOf<typeof CertFacetCountType>;
export type CertFacets = t.TypeOf<typeof CertFacetsType>;

export type Cert = t.TypeOf<typeof CertType>;
export type CertMonitor = t.TypeOf<typeof CertMonitorType>;
export type CertResult = t.TypeOf<typeof CertResultType>;
