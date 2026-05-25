/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

// Local copies of the runtime types and TS interfaces needed by the Scout
// uptime legacy API tests. Mirrors the relevant subset of
// x-pack/solutions/observability/plugins/uptime/common/runtime_types so the
// test directory stays self-contained and is not coupled to uptime plugin
// internals.

export const CertMonitorType = t.partial({
  name: t.string,
  id: t.string,
  configId: t.string,
  url: t.string,
});

export const CertType = t.intersection([
  t.type({
    monitors: t.array(CertMonitorType),
    sha256: t.string,
  }),
  t.partial({
    not_after: t.string,
    not_before: t.string,
    common_name: t.string,
    issuer: t.string,
    sha1: t.string,
    monitorName: t.string,
    monitorType: t.string,
    monitorUrl: t.string,
    locationName: t.string,
  }),
]);

export type Cert = t.TypeOf<typeof CertType>;

export interface CertResult {
  certs: Cert[];
  total: number;
}

// The full MonitorSummary / MonitorSummariesResult schemas live in the uptime
// plugin's runtime_types. The tests only need the fields they read, so the
// minimal structural types below are sufficient.
export interface MonitorSummary {
  monitor_id: string;
  state: {
    url: { full?: string };
    summary?: { up?: number; down?: number; status?: string };
  };
}

export interface MonitorSummariesResult {
  summaries: MonitorSummary[];
  prevPagePagination: string | null;
  nextPagePagination: string | null;
  totalSummaryCount?: number;
}
