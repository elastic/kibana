/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  employeesIndexCreateRequest,
  logsIndexCreateRequest,
  metricbeatIndexCreateRequest,
  nycTaxisIndexCreateRequest,
  packetbeatIndexCreateRequest,
  postgresLogsIndexCreateRequest,
} from './indices';

/**
 * Documents the regression dataset's gold queries need in order to execute.
 *
 * `./indices.ts` creates the fixture indices with their mappings; this file
 * puts representative ECS documents in them. Both halves are load-bearing: an
 * index that exists but holds no documents makes every gold query targeting it
 * return an empty result set, and `ES|QL Result Equivalence` scores 1.0 on two
 * empty result sets (`compareRowMultisets` returns a jaccard of 1 for 0 rows
 * against 0 rows). In the run that motivated this corpus, 80 of 186 Result
 * Equivalence cells scored 1.0 that way and only 6 were real exact matches, so
 * most of the evaluator's output measured the fixtures rather than the models.
 *
 * Each group below names the gold query it exists for (by position in
 * `../dataset.ts`), so a gold that stops matching its data is easy to trace
 * back. Sizing is not decorative either: three golds filter on a *count*
 * (`count_distinct(...) > 5`, `... > 100`, `... > 5`), and a counted filter
 * only returns a row when the corpus holds more documents than the threshold.
 * `corpusThresholds` pins those numbers; `./setup.test.ts` and the runtime
 * check in `./setup.ts` fail loudly when an index or a gold loses its data.
 *
 * Documents whose gold filters on relative time (`@timestamp >= NOW() - 24
 * hours` on `traces-apm-*`, `NOW() - 15 minutes` on `logs-*`) are stamped with
 * the moment this module was loaded, i.e. the start of the run that indexes
 * them. A pinned calendar date would leave those golds permanently outside
 * their own window and re-create the empty-result-set defect the corpus exists
 * to prevent.
 */
const RUN_TIMESTAMP = new Date().toISOString();

/**
 * How many documents each count-filtered gold needs before its filter can
 * return a row. The golds count documents, they do not just match one, so the
 * corpus has to hold more rows than the threshold.
 */
export const corpusThresholds = {
  /** `#17` — `unique_queries > 5` distinct `dns.question.name` per registered domain. */
  distinctDnsQuestionsPerDomain: 6,
  /** `#22` — `domain_requests > 100` per `source.ip` + `url.domain`. */
  beaconingRequestsPerDomain: 101,
  /** `#29` — `login_counts > 5` failed logins per `source.ip`. */
  failedLoginsPerSourceIp: 6,
} as const;

type Document = Record<string, unknown>;

/**
 * `logs-*`: the index most of the dataset targets. One group per blocking
 * filter, plus the three counted groups at the end.
 */
const logsDocuments: readonly Document[] = [
  // #5 (`process.name == "curl.exe"`, `sum(source.bytes) BY
  // destination.address`), #12 (`SUM(bytes_transferred) > 1000000` by
  // destination), #16 and #18 (non-standard port, destination outside the
  // private ranges), #20 (`network.bytes > 1000000`), #21 (large transfer
  // bucket), #28 (per-user/host counts over public destinations).
  {
    '@timestamp': RUN_TIMESTAMP,
    bytes_transferred: 2500000,
    network: { bytes: 2500000, direction: 'outbound' },
    process: { name: 'curl.exe' },
    source: { ip: '10.0.0.15', bytes: 2500000 },
    destination: { ip: '203.0.113.42', address: 'files.exfil-host.example', port: 8443 },
    host: { name: 'web-01' },
    user: { name: 'svc-deploy' },
  },
  // #9 (`process.name == "ssh"` on a non-standard port) and #18 (destination
  // outside `10.0.0.0/8` / `192.168.0.0/16`). Medium transfer bucket for #21.
  {
    '@timestamp': RUN_TIMESTAMP,
    bytes_transferred: 50000,
    network: { bytes: 50000, direction: 'outbound' },
    process: { name: 'ssh', working_directory: '/usr/bin' },
    source: { ip: '10.0.0.15', bytes: 50000 },
    destination: { ip: '198.51.100.7', address: 'bastion.partner.example', port: 2222 },
    host: { name: 'web-01' },
  },
  // #10 (`log.message RLIKE ".*evilpayload.*"`).
  {
    '@timestamp': RUN_TIMESTAMP,
    log: { message: 'GET /index.php?cmd=evilpayload HTTP/1.1" 200 41' },
    url: { domain: 'malware-host.example', path: '/index.php' },
    source: { ip: '10.0.0.15' },
    host: { name: 'web-01' },
  },
  // #11 (file creation, counted by process and host, then DISSECTed on
  // `process.name` and filtered on `length(process.name) > 15`). The name is
  // deliberately longer than that threshold and carries the `.exe` split the
  // gold's DISSECT expects.
  {
    '@timestamp': RUN_TIMESTAMP,
    event: { category: 'file', action: 'creation' },
    file: { name: 'C:\\Windows\\Temp\\svc-patch-2841.bin' },
    process: { name: 'windows-update-service.exe', working_directory: 'C:\\Windows\\Temp' },
    host: { name: 'win-01' },
  },
  // #14 (`process.working_directory RLIKE "/tmp.*"`).
  {
    '@timestamp': RUN_TIMESTAMP,
    process: { name: 'kworker-helper', working_directory: '/tmp/.cache/kworker-helper' },
    host: { name: 'web-01' },
  },
  // #15 (`url.domain RLIKE ".*paypa1.*|.*banking.*"`) and one of the two rare
  // user agents of #13 (`user_agent_count < 5`).
  {
    '@timestamp': RUN_TIMESTAMP,
    url: { domain: 'paypa1-secure-login.example', path: '/signin' },
    user_agent: { original: 'Mozilla/5.0 (X11; Linux x86_64) rare-agent/1.0' },
    source: { ip: '10.0.0.15' },
    host: { name: 'web-01' },
  },
  // #23 (`url.path RLIKE "/admin/*"`), second rare user agent for #13.
  {
    '@timestamp': RUN_TIMESTAMP,
    url: { domain: 'intranet.example', path: '/admin/users' },
    user_agent: { original: 'curl/8.4.0' },
    source: { ip: '10.0.0.15' },
    host: { name: 'web-01' },
  },
  // #24 (`process.name == "powershell.exe"` and `command_line RLIKE
  // ".*EncodedCommand.*"`).
  {
    '@timestamp': RUN_TIMESTAMP,
    event: { category: 'process', action: 'start' },
    process: { name: 'powershell.exe' },
    command_line: 'powershell.exe -NoProfile -EncodedCommand ZQBjAGgAbwAgAHQAaABpAHMA',
    host: { name: 'win-01' },
    user: { name: 'j.doe' },
  },
  // #25 (`event.code IS NOT NULL`, counted by code and host; the ENRICH that
  // follows needs the `win_events` policy the fixture setup provisions).
  {
    '@timestamp': RUN_TIMESTAMP,
    event: { category: 'process', action: 'start', code: 4688 },
    host: { name: 'win-01' },
  },
  // #8 (`@timestamp >= NOW() - 15 minutes`, average of
  // `system.cpu.total.norm.pct` per host): one document per host, both inside
  // the run-relative window.
  {
    '@timestamp': RUN_TIMESTAMP,
    system: { cpu: { total: { norm: { pct: 0.42 } } } },
    host: { name: 'web-01' },
  },
  {
    '@timestamp': RUN_TIMESTAMP,
    system: { cpu: { total: { norm: { pct: 0.71 } } } },
    host: { name: 'db-01' },
  },
  // #27 (`event.action == "failed_login"`, grouped by reason) and #29 (more
  // than 5 failed logins from one source). Mixed `error_code` values so the
  // gold's CASE also produces more than one bucket.
  ...Array.from({ length: corpusThresholds.failedLoginsPerSourceIp }, (_, position) => ({
    '@timestamp': RUN_TIMESTAMP,
    event: { category: 'authentication', action: 'failed_login' },
    error_code: position % 2 === 0 ? '403' : '404',
    source: { ip: '10.0.0.15' },
    user: { name: 'j.doe' },
    host: { name: 'web-01' },
  })),
  // #17 (GROK + `count_distinct(dns.question.name) > 5` per registered
  // domain): distinct questions, all under one registered domain.
  ...Array.from({ length: corpusThresholds.distinctDnsQuestionsPerDomain }, (_, position) => ({
    '@timestamp': RUN_TIMESTAMP,
    dns: {
      question: { name: `host-${position}.corp.example`, registered_domain: 'corp.example' },
    },
    source: { ip: '10.0.0.15' },
    host: { name: 'web-01' },
  })),
  // #22 (`domain_requests > 100` per `source.ip` + `url.domain`). Small
  // transfers, so these documents only feed #22 and the small bucket of #21.
  ...Array.from({ length: corpusThresholds.beaconingRequestsPerDomain }, () => ({
    '@timestamp': RUN_TIMESTAMP,
    bytes_transferred: 512,
    network: { bytes: 512, direction: 'outbound' },
    url: { domain: 'beacon.tracking-cdn.example', path: '/ping' },
    source: { ip: '10.0.0.15', bytes: 512 },
    destination: { ip: '198.51.100.9', address: 'tracking-cdn.example', port: 443 },
    host: { name: 'web-01' },
  })),
];

/**
 * `postgres-logs-*`: #0 (DISSECT of `message` for
 * `"%{} duration: %{query_duration} ms"`, then an average).
 */
const postgresLogsDocuments: readonly Document[] = [
  {
    '@timestamp': RUN_TIMESTAMP,
    message: '2025-01-01 08:14:02 UTC [4127] LOG:  duration: 250 ms  statement: SELECT 1',
  },
  {
    '@timestamp': RUN_TIMESTAMP,
    message: '2025-01-01 08:14:03 UTC [4128] LOG:  statement: COMMIT',
  },
];

/**
 * `nyc_taxis-*`: #3 (`drop_off_time` between 06:00 and 10:00, LIMIT 10).
 * `drop_off_time` is the field the fixture maps, and the mapping's date format
 * is `strict_date_optional_time`.
 */
const nycTaxisDocuments: readonly Document[] = [
  { drop_off_time: '2025-01-01T07:30:00.000Z' },
  { drop_off_time: '2025-01-01T08:45:00.000Z' },
];

/**
 * `employees-*`: #4 (five earliest hires, formatted) and #7 (sorted by salary,
 * page of 10). Three hires, so "earliest five" and a sorted page both return
 * rows.
 */
const employeesDocuments: readonly Document[] = [
  { emp_no: '10001', hire_date: '2019-09-02', salary: 60000 },
  { emp_no: '10002', hire_date: '2020-01-15', salary: 75000 },
  { emp_no: '10003', hire_date: '2021-06-30', salary: 90000 },
];

/**
 * `metricbeat-*`: #6 (CPU time normalised by cores, grouped by host). Two
 * hosts so the grouping has more than one row.
 */
const metricbeatDocuments: readonly Document[] = [
  {
    '@timestamp': RUN_TIMESTAMP,
    system: { cpu: { user: { pct: 0.4 }, system: { pct: 0.2 }, cores: 4 } },
    host: { name: 'web-01' },
  },
  {
    '@timestamp': RUN_TIMESTAMP,
    system: { cpu: { user: { pct: 0.1 }, system: { pct: 0.05 }, cores: 8 } },
    host: { name: 'db-01' },
  },
];

/**
 * `packetbeat-*`: #19 (top unique `destination.domain` values by doc count).
 */
const packetbeatDocuments: readonly Document[] = [
  { '@timestamp': RUN_TIMESTAMP, destination: { domain: 'api.example.com' } },
  { '@timestamp': RUN_TIMESTAMP, destination: { domain: 'cdn.example.com' } },
];

/**
 * `traces-apm-*` (#2, `@timestamp >= NOW() - 24 hours`, then success rate,
 * average `transaction.duration.us` and request count per service) and
 * `metrics-apm-*` (#1, a fixed 50-bucket window on 2024-04-02, so this
 * document's timestamp is deliberately pinned to that window rather than to
 * the run).
 */
export const tracesApmIndexRequest: IndexRequest = {
  index: 'traces-apm-production.evaluations.2025.01.01',
  document: {
    '@timestamp': RUN_TIMESTAMP,
    event: { outcome: 'success' },
    transaction: {
      duration: { us: 1000 },
      id: '945254c567a5417e',
    },
    service: { name: 'my-service' },
  },
};

export const metricsApmIndexRequest: IndexRequest = {
  index: 'metrics-apm-production.evaluations.2025.01.01',
  document: {
    '@timestamp': '2024-04-02T12:00:00.000Z',
    metricset: {
      name: 'transaction',
      interval: '1m',
    },
    transaction: {
      duration: { us: 13980 },
    },
  },
};

const indexRequests = (index: string, documents: readonly Document[]): IndexRequest[] =>
  documents.map((document) => ({ index, document }));

export const esqlFixtureDocumentRequests: readonly IndexRequest[] = [
  tracesApmIndexRequest,
  metricsApmIndexRequest,
  ...indexRequests(logsIndexCreateRequest.index, logsDocuments),
  ...indexRequests(postgresLogsIndexCreateRequest.index, postgresLogsDocuments),
  ...indexRequests(nycTaxisIndexCreateRequest.index, nycTaxisDocuments),
  ...indexRequests(employeesIndexCreateRequest.index, employeesDocuments),
  ...indexRequests(metricbeatIndexCreateRequest.index, metricbeatDocuments),
  ...indexRequests(packetbeatIndexCreateRequest.index, packetbeatDocuments),
];
