/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

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
  includeBrowserCerts: t.boolean,
});

export type GetCertsParams = t.TypeOf<typeof GetCertsParamsType>;

export const CertMonitorType = t.partial({
  name: t.string,
  id: t.string,
  configId: t.string,
  url: t.string,
  type: t.string,
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
  }),
]);

export const CertStatsType = t.type({
  expired: t.number,
  expiringSoon: t.number,
});

export const CertResultType = t.intersection([
  t.type({
    certs: t.array(CertType),
    total: t.number,
  }),
  t.partial({
    stats: CertStatsType,
  }),
]);

export type CertStats = t.TypeOf<typeof CertStatsType>;

export type Cert = t.TypeOf<typeof CertType>;
export type CertMonitor = t.TypeOf<typeof CertMonitorType>;
export type CertResult = t.TypeOf<typeof CertResultType>;
