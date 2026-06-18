/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { existsQuery, kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { InfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { HOST_METRIC_BUILDERS } from './reconstruct';
import type { InfraCapturedSource } from './reconstruct';

/** ECS (metricbeat/system module) metricsets the `infra.host(...)` DSL can regenerate. */
const ECS_METRICSETS = Object.keys(HOST_METRIC_BUILDERS);

/**
 * Canonical ECS vs semconv (OTel) host filters, reused verbatim from the host inventory model so
 * the capture sees exactly the same documents the Hosts view does for each schema:
 *  - ECS: `event.module: system` / `metricset.module: system`.
 *  - semconv: `data_stream.dataset: hostmetricsreceiver.otel`.
 *
 * Crucially the semconv filter does NOT depend on `metricset.name` (a metricbeat-only field that
 * real OTel hostmetrics don't set), so the capture works for genuine OTel data, not just synthetic.
 */
const hostInventoryModel = findInventoryModel('host');
const ECS_NODE_FILTER = hostInventoryModel.nodeFilter?.({ schema: 'ecs' }) ?? [];
const SEMCONV_NODE_FILTER = hostInventoryModel.nodeFilter?.({ schema: 'semconv' }) ?? [];

/**
 * Semconv (OTel) host metrics carry no `metricset.name`, and a single time-ordered scan over the
 * OTel data stream gets dominated by whichever metric has the most documents per tick (filesystem
 * emits one doc per mount point), starving cpu/memory/load and the Hosts view KPIs that depend on
 * them. So we scan per metric group, identified by the presence of a representative metric field
 * (both the OTel `metrics.system.*` field and its `system.*` index alias are matched). Each group
 * gets its own slice of the document budget, mirroring the per-metricset ECS scans.
 *
 * NOTE: this list is a query-fairness device (which representative field identifies each scan), NOT a
 * field allowlist for the capture. The captured documents are stored with full `_source`, so every
 * field is preserved regardless of what's listed here (see `reconstruct.ts` `collectNumericLeaves`).
 */
const SEMCONV_METRIC_GROUPS: ReadonlyArray<{ name: string; fields: readonly string[] }> = [
  // Native OTel emits the cpu domain as SEPARATE metric documents: utilization (CPU usage),
  // load_average.{1,5,15}m (Load KPIs), and logical.count (the core count). The Normalized Load KPI
  // is `avg(load_average.1m) / max(logical.count)`, so all three must be captured or it renders N/A.
  // Match any of them so no high-volume metric starves the others within the cpu budget.
  {
    name: 'cpu',
    fields: [
      'metrics.system.cpu.utilization',
      'system.cpu.utilization',
      'metrics.system.cpu.load_average.1m',
      'system.cpu.load_average.1m',
      'metrics.system.cpu.load_average.5m',
      'metrics.system.cpu.load_average.15m',
      'metrics.system.cpu.logical.count',
      'system.cpu.logical.count',
    ],
  },
  {
    name: 'memory',
    fields: [
      'metrics.system.memory.utilization',
      'system.memory.utilization',
      'metrics.system.memory.usage',
      'system.memory.usage',
    ],
  },
  { name: 'filesystem', fields: ['metrics.system.filesystem.usage', 'system.filesystem.usage'] },
  { name: 'network', fields: ['metrics.system.network.io', 'system.network.io'] },
  // Disk read/write IOPS (`system.disk.operations`) and throughput (`system.disk.io`) power the
  // Disk Read/Write IOPS & Throughput KPIs. These are a separate, lower-volume metric domain in the
  // OTel data stream, so without their own group they get starved by cpu/memory/filesystem and the
  // Hosts view renders them as N/A.
  {
    name: 'disk',
    fields: [
      'metrics.system.disk.operations',
      'system.disk.operations',
      'metrics.system.disk.io',
      'system.disk.io',
    ],
  },
];

/** Distinct hosts to capture per metric scan. A `terms` agg ceiling, well above any realistic fleet. */
const MAX_CAPTURE_HOSTS = 1000;
/**
 * Cap on documents captured per host per metric scan. Bounded by Elasticsearch's default
 * `index.max_inner_result_window` (100), which `top_hits` cannot exceed.
 */
const MAX_HITS_PER_HOST = 100;

/** Shape of the per-host `terms` + `top_hits` aggregation result we read back. */
interface HostBucket {
  key: string;
  doc_count: number;
  docs: { hits: { hits: Array<{ _source?: InfraCapturedSource }> } };
}
interface HostTermsAgg {
  buckets: HostBucket[];
  sum_other_doc_count: number;
}

/**
 * Fetches the raw host metric `_source` behind the current Infrastructure page so it can be
 * reconstructed into a synthtrace scenario. Supports BOTH schemas the Hosts view renders:
 *  - ECS (metricbeat/system module): cpu/memory/network/load/core/filesystem/diskio.
 *  - semconv (OTel hostmetrics, `hostmetricsreceiver.otel` dataset).
 *
 * Each metric scan (per ECS metricset, per semconv metric group) is host-fair: rather than a flat
 * `@timestamp`-ordered page scan — which fills its budget with whichever hosts report in the
 * earliest timestamps and silently drops the rest (OTel collectors scrape on staggered phases, so a
 * dense fleet collapses to a handful of hosts) — it uses a `terms(host.name)` aggregation with a
 * per-host `top_hits` sub-aggregation. Every host therefore gets its own guaranteed slice of the
 * budget for every metric, so a multi-host deployment is captured in full.
 *
 * ECS is scanned per-metricset (cpu/memory/load/...) because those live in separate indices and a
 * combined scan would starve whichever index Elasticsearch returns last (dropping the Hosts view
 * KPIs that depend on it, e.g. Normalized Load from `load`). Semconv is scanned per metric group
 * (matched by representative field existence) so a high-volume metric like filesystem can't starve
 * cpu/memory/load within the shared `hostmetricsreceiver.otel` data stream.
 *
 * The caller is responsible for clamping `start`/`end` to a sane window so the scan stays bounded
 * no matter how wide a range the user selected.
 */
export async function getInfraCaptureDocs({
  infraMetricsClient,
  start,
  end,
  kuery,
  hostName,
  maxDocs,
}: {
  infraMetricsClient: InfraMetricsClient;
  start: number;
  end: number;
  kuery: string;
  /** Host the page is scoped to (e.g. the host detail view), if any. */
  hostName?: string;
  maxDocs: number;
}): Promise<{ docs: InfraCapturedSource[]; truncated: boolean }> {
  const baseFilter = [
    ...rangeQuery(start, end),
    ...kqlQuery(kuery),
    ...termQuery('host.name', hostName),
    ...existsQuery('host.name'),
  ];

  // ECS: scoped to the system module (via the canonical node filter), then narrowed to a single
  // metricset by dataset (`system.cpu`) or `metricset.name`.
  const ecsQueries = ECS_METRICSETS.map(
    (metricset): QueryDslQueryContainer => ({
      bool: {
        filter: [...baseFilter, ...ECS_NODE_FILTER],
        should: [
          { term: { 'event.dataset': `system.${metricset}` } },
          { term: { 'data_stream.dataset': `system.${metricset}` } },
          { term: { 'metricset.name': metricset } },
        ],
        minimum_should_match: 1,
      },
    })
  );

  // Semconv: one scan per metric group, each matched by the presence of a representative field, so
  // no single high-volume metric (e.g. filesystem) starves the rest.
  const semconvQueries = SEMCONV_METRIC_GROUPS.map(
    (group): QueryDslQueryContainer => ({
      bool: {
        filter: [...baseFilter, ...SEMCONV_NODE_FILTER],
        should: group.fields.map((field) => ({ exists: { field } })),
        minimum_should_match: 1,
      },
    })
  );

  const queries = [...ecsQueries, ...semconvQueries];

  // Count distinct hosts across both schemas so the per-host `top_hits` budget can be sized to keep
  // every host represented while staying under `maxDocs`. The `host.name` field is the canonical
  // host id for both ECS and semconv in the inventory model.
  const hostCountResponse = await infraMetricsClient.search(
    {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: baseFilter,
          should: [...ECS_NODE_FILTER, ...SEMCONV_NODE_FILTER],
          minimum_should_match: 1,
        },
      },
      aggs: { host_count: { cardinality: { field: 'host.name' } } },
    },
    'count_hosts_for_infra_synthtrace_capture'
  );
  const hostCount = Math.max(
    1,
    (hostCountResponse.aggregations as { host_count?: { value?: number } } | undefined)?.host_count
      ?.value ?? 1
  );

  // Divide the budget across (scans x hosts) so each host gets a fair, bounded number of docs per
  // metric. Capped at `MAX_HITS_PER_HOST` (the `top_hits` inner-result-window limit) and floored at
  // 1 so even a very dense fleet keeps at least one sample per host per metric (enough for presence
  // and the avg/max KPI cards), rather than dropping whole hosts.
  const perHostHits = Math.max(
    1,
    Math.min(MAX_HITS_PER_HOST, Math.floor(maxDocs / (queries.length * hostCount)))
  );

  const docs: InfraCapturedSource[] = [];
  let truncated = hostCount > MAX_CAPTURE_HOSTS;

  for (const query of queries) {
    const response = await infraMetricsClient.search(
      {
        track_total_hits: false,
        size: 0,
        query,
        aggs: {
          hosts: {
            terms: { field: 'host.name', size: MAX_CAPTURE_HOSTS },
            aggs: {
              docs: {
                top_hits: {
                  size: perHostHits,
                  sort: [{ '@timestamp': { order: 'desc' } }],
                  _source: true,
                },
              },
            },
          },
        },
      },
      'get_docs_for_infra_synthtrace_capture'
    );

    const hostsAgg = (response.aggregations as { hosts?: HostTermsAgg } | undefined)?.hosts;
    if (!hostsAgg) {
      continue;
    }
    if (hostsAgg.sum_other_doc_count > 0) {
      truncated = true;
    }
    for (const bucket of hostsAgg.buckets) {
      if (bucket.doc_count > perHostHits) {
        truncated = true;
      }
      for (const hit of bucket.docs.hits.hits) {
        if (hit._source !== undefined && hit._source !== null) {
          docs.push(hit._source);
        }
      }
    }
  }

  return { docs, truncated };
}
