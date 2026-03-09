/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

/**
 * Downloads and ingests the RCAEval RE3-OB dataset into Elasticsearch.
 *
 * RE3-OB contains 30 failure cases (10 fault types × 3 instances) from the
 * Online Boutique microservice system, with real stack traces and code-level
 * faults. See https://github.com/phamquiluan/RCAEval
 *
 * The script automatically downloads the dataset (~178 MB) on first run
 * and caches it locally. Timestamps are remapped into a recent window so
 * the data works with default time ranges.
 *
 * Ingests three signal types:
 *   - Logs   → bulk indexed into logs-rcaeval.re3-default
 *   - Traces → sent via OTLP to EDOT Collector (produces APM data)
 *   - Metrics → bulk indexed into metrics-rcaeval.re3-default
 *
 * Usage:
 *   npx tsx scripts/ingest_rcaeval.ts                         # list available cases
 *   npx tsx scripts/ingest_rcaeval.ts --case adservice_f4/1
 *   npx tsx scripts/ingest_rcaeval.ts --window 2h --es-url http://elastic:changeme@localhost:9200
 *   npx tsx scripts/ingest_rcaeval.ts --skip-traces --skip-metrics  # logs only
 *
 * Options:
 *   --es-url <url>            Elasticsearch URL (default: http://elastic:changeme@localhost:9200)
 *   --window <duration>       Time window to map data into, relative to now (default: 1h)
 *   --case <name>             Single case to ingest, e.g. "adservice_f4/1" (lists cases if omitted)
 *   --source <path>           Local RE3-OB directory instead of downloading
 *   --clean                   Delete data streams and exit (removes all ingested data)
 *   --otlp-endpoint <url>     OTLP endpoint for traces (default: http://localhost:4318)
 *   --skip-traces             Skip trace ingestion (no EDOT Collector required)
 *   --skip-metrics            Skip metric ingestion
 *   --max-trace-rows <N>      Limit trace rows per file via uniform sampling (default: 200000)
 */

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import globby from 'globby';
import {
  type BaseArgs,
  type DatasetId,
  type OtlpSpan,
  type OtlpResourceSpans,
  parseArgs,
  parseDuration,
  parseCsv,
  downloadFile,
  extractZip,
  inferLogLevel,
  remapTimestamps,
  createEsClient,
  ensureIndexTemplate,
  deleteDataStream,
  restoreAndRefresh,
  bulkIndex,
  maskPassword,
  printVerifyCommands,
  checkOtlpEndpoint,
  exportTracesViaOtlp,
  deleteApmDataStreams,
  INFRA_METRIC_MAPPINGS,
} from './ingest_utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ZENODO_URL = 'https://zenodo.org/records/14590730/files/RE3-OB.zip?download=1';
const LOG_INDEX_NAME = 'logs-rcaeval.re3-default';
const LOG_TEMPLATE_NAME = 'rcaeval-re3-logs';
const METRIC_INDEX_NAME = 'metrics-rcaeval.re3-default';
const METRIC_TEMPLATE_NAME = 'rcaeval-re3-metrics';
const DATASET_ID: DatasetId = 'rcaeval-re3';
const DEFAULT_OTLP_ENDPOINT = 'http://localhost:4318';
const DEFAULT_MAX_TRACE_ROWS = 200_000;

const PLUGIN_ROOT = resolve(__dirname, '..');
const DATASETS_DIR = join(PLUGIN_ROOT, 'datasets');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface RcaEvalArgs extends BaseArgs {
  case?: string;
  source?: string;
  'otlp-endpoint'?: string;
  'max-trace-rows'?: string;
}

function getOpts() {
  const raw = parseArgs<RcaEvalArgs>(['case', 'source', 'otlp-endpoint', 'max-trace-rows'], {
    'otlp-endpoint': DEFAULT_OTLP_ENDPOINT,
  });
  const rawMaxRows = raw['max-trace-rows'];
  const maxTraceRows = rawMaxRows ? parseInt(rawMaxRows, 10) : DEFAULT_MAX_TRACE_ROWS;
  return {
    esUrl: raw.esUrl,
    window: raw.window,
    caseName: raw.case,
    source: raw.source,
    otlpEndpoint: raw['otlp-endpoint'] ?? DEFAULT_OTLP_ENDPOINT,
    maxTraceRows: !isNaN(maxTraceRows) && maxTraceRows > 0 ? maxTraceRows : undefined,
    clean: process.argv.includes('--clean'),
    skipTraces: process.argv.includes('--skip-traces'),
    skipMetrics: process.argv.includes('--skip-metrics'),
  };
}

// ---------------------------------------------------------------------------
// Download and extract
// ---------------------------------------------------------------------------

async function ensureDataset(source?: string): Promise<string> {
  if (source) {
    if (!existsSync(source)) {
      throw new Error(`Source directory does not exist: ${source}`);
    }
    return source;
  }

  const extractedDir = join(DATASETS_DIR, 'RE3-OB');
  if (existsSync(extractedDir)) {
    console.log(`Using cached dataset at ${extractedDir}`);
    return extractedDir;
  }

  mkdirSync(DATASETS_DIR, { recursive: true });

  const zipPath = join(DATASETS_DIR, 'RE3-OB.zip');
  if (!existsSync(zipPath)) {
    console.log(`Downloading RE3-OB.zip (~178 MB) from Zenodo...`);
    await downloadFile(ZENODO_URL, zipPath);
  }

  console.log('Extracting RE3-OB.zip...');
  await extractZip(zipPath, DATASETS_DIR);

  if (!existsSync(extractedDir)) {
    throw new Error(`Expected directory ${extractedDir} after extraction, but it does not exist`);
  }

  console.log(`Dataset ready at ${extractedDir}`);
  return extractedDir;
}

// ---------------------------------------------------------------------------
// Case discovery
// ---------------------------------------------------------------------------

interface CaseInfo {
  path: string;
  faultService: string;
  faultType: string;
  instance: string;
  injectTime: number;
}

function parseCaseName(caseName: string): {
  faultService: string;
  faultType: string;
  instance: string;
} {
  const [faultDir, instance = '1'] = caseName.split('/');
  const lastUnderscore = faultDir.lastIndexOf('_');
  return {
    faultService: faultDir.slice(0, lastUnderscore),
    faultType: faultDir.slice(lastUnderscore + 1),
    instance,
  };
}

function discoverCases(dataDir: string, filterCase?: string): CaseInfo[] {
  const pattern = filterCase
    ? join(dataDir, filterCase.split('/')[0], filterCase.split('/')[1] ?? '*', 'logs.csv')
    : join(dataDir, '*', '*', 'logs.csv');

  return globby
    .sync(pattern)
    .sort()
    .map((logsFile) => {
      const casePath = dirname(logsFile);
      const caseName = relative(dataDir, casePath);
      const { faultService, faultType, instance } = parseCaseName(caseName);
      const injectFile = join(casePath, 'inject_time.txt');
      const injectTime = existsSync(injectFile)
        ? parseInt(readFileSync(injectFile, 'utf-8').trim(), 10)
        : 0;
      return { path: casePath, faultService, faultType, instance, injectTime };
    });
}

// ---------------------------------------------------------------------------
// ECS document building
// ---------------------------------------------------------------------------

function buildDocuments(caseInfo: CaseInfo, windowMs: number): Record<string, unknown>[] {
  const csvText = readFileSync(join(caseInfo.path, 'logs.csv'), 'utf-8');
  const rows = parseCsv(csvText);

  const nsTimestamps = rows.map((row) => parseInt(row.timestamp, 10));
  const msTimestamps = nsTimestamps.map((ns) => Math.round(ns / 1e6));
  const remapped = remapTimestamps(msTimestamps, windowMs);

  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ts = remapped[i];
    if (!ts || !row.message) continue;

    docs.push({
      '@timestamp': new Date(ts).toISOString(),
      message: row.message,
      'log.level': inferLogLevel(row.message),
      'service.name': row.container_name,
      'container.name': row.container_name,
      'kubernetes.pod.name': row.pod_name ?? '',
      'kubernetes.node.name': row.node_name ?? '',
      'labels.dataset': 'rcaeval-re3-ob',
    });
  }

  return docs;
}

// ---------------------------------------------------------------------------
// Trace building (traces.csv → OTLP spans)
// ---------------------------------------------------------------------------

function buildTraceSpans(
  caseInfo: CaseInfo,
  windowMs: number,
  maxTraceRows?: number
): OtlpResourceSpans[] {
  const tracesFile = join(caseInfo.path, 'traces.csv');
  if (!existsSync(tracesFile)) return [];

  const csvText = readFileSync(tracesFile, 'utf-8');
  let rows = parseCsv(csvText);
  if (rows.length === 0) return [];

  if (maxTraceRows && rows.length > maxTraceRows) {
    const interval = Math.ceil(rows.length / maxTraceRows);
    console.log(
      `  Sampling every ${interval}th trace row (${maxTraceRows.toLocaleString()} of ${rows.length.toLocaleString()})`
    );
    rows = rows.filter((_, i) => i % interval === 0);
  }

  const startTimeField = rows[0].startTime !== undefined ? 'startTime' : 'startTimeMillis';
  const isMicros = startTimeField === 'startTime';

  const rawStartTimesMs = rows.map((row) => {
    const val = parseInt(row[startTimeField], 10);
    return isMicros ? Math.round(val / 1e3) : val;
  });
  const remapped = remapTimestamps(rawStartTimesMs, windowMs);

  const spansByService = new Map<string, OtlpSpan[]>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const remappedStartMs = remapped[i];
    if (!remappedStartMs) continue;

    const durationUs = parseInt(row.duration, 10) || 0;
    const durationNs = durationUs * 1000;
    const startNano = BigInt(remappedStartMs) * 1_000_000n;
    const endNano = startNano + BigInt(durationNs);

    const traceId = (row.traceID || row.traceId || '').padStart(32, '0').slice(0, 32);
    const spanId = (row.spanID || row.spanId || '').padStart(16, '0').slice(0, 16);
    const parentSpanId = row.parentSpanID || row.parentSpanId || '';
    const serviceName = row.serviceName || row.service_name || 'unknown';
    const operationName = row.operationName || row.operation_name || row.methodName || 'unknown';
    const statusCode = parseInt(row.statusCode || row.status_code || '0', 10);

    // Normalize: strip "grpc." prefix and leading "/" to get clean gRPC path
    let grpcPath = operationName;
    if (grpcPath.startsWith('grpc.')) grpcPath = grpcPath.slice(5);
    if (grpcPath.startsWith('/')) grpcPath = grpcPath.slice(1);

    const grpcSlashIdx = grpcPath.indexOf('/');
    const grpcServiceFull = grpcSlashIdx > 0 ? grpcPath.slice(0, grpcSlashIdx) : null;

    // Span kind: compare gRPC service short name to serviceName.
    // e.g. operationName "hipstershop.ProductCatalogService/GetProduct"
    // on serviceName "productcatalogservice" → extract "ProductCatalogService"
    // → lowercase → matches → SERVER
    let isServer = false;
    if (grpcServiceFull) {
      const lastDot = grpcServiceFull.lastIndexOf('.');
      const shortName = (
        lastDot >= 0 ? grpcServiceFull.slice(lastDot + 1) : grpcServiceFull
      ).toLowerCase();
      isServer = shortName === serviceName.toLowerCase();
    }
    const spanKind = isServer ? 2 : 3; // SERVER=2, CLIENT=3

    const attributes: OtlpSpan['attributes'] = [
      // EDOT 9.3.1 connector (v0.29.0) does not enrich span.name from the
      // span Name() field. Without this attribute the signaltometrics connector
      // skips service_destination metrics entirely because span.name is a
      // required (non-optional) dimension. Newer connector versions (≥v0.29.1)
      // add this automatically.
      { key: 'span.name', value: { stringValue: operationName } },
    ];

    if (grpcServiceFull) {
      attributes.push({
        key: 'rpc.service',
        value: { stringValue: grpcServiceFull },
      });
      attributes.push({ key: 'rpc.system', value: { stringValue: 'grpc' } });
    }

    if (row.methodName) {
      attributes.push({ key: 'rpc.method', value: { stringValue: row.methodName } });
    }
    if (statusCode) {
      attributes.push({ key: 'rpc.grpc.status_code', value: { intValue: statusCode } });
    }

    const otlpStatus = statusCode > 0 ? { code: 2, message: `gRPC ${statusCode}` } : { code: 1 };

    const span: OtlpSpan = {
      traceId,
      spanId,
      ...(parentSpanId && parentSpanId !== '0'
        ? { parentSpanId: parentSpanId.padStart(16, '0').slice(0, 16) }
        : {}),
      name: operationName,
      kind: spanKind,
      startTimeUnixNano: startNano.toString(),
      endTimeUnixNano: endNano.toString(),
      attributes,
      status: otlpStatus,
    };

    const existing = spansByService.get(serviceName);
    if (existing) {
      existing.push(span);
    } else {
      spansByService.set(serviceName, [span]);
    }
  }

  return Array.from(spansByService.entries()).map(([serviceName, spans]) => ({
    serviceName,
    spans,
  }));
}

// ---------------------------------------------------------------------------
// Metric building (metrics.json → ECS metric documents)
// ---------------------------------------------------------------------------

function buildMetricDocuments(caseInfo: CaseInfo, windowMs: number): Record<string, unknown>[] {
  const csvCandidates = ['simple_metrics.csv', 'data.csv'];
  for (const name of csvCandidates) {
    const csvFile = join(caseInfo.path, name);
    if (existsSync(csvFile)) {
      return buildMetricsFromDataCsv(csvFile, windowMs);
    }
  }

  const metricsFile = join(caseInfo.path, 'metrics.json');
  if (!existsSync(metricsFile)) return [];

  let metricsData: Record<string, unknown>;
  try {
    metricsData = JSON.parse(readFileSync(metricsFile, 'utf-8'));
  } catch {
    return [];
  }

  const docs: Record<string, unknown>[] = [];

  if (typeof metricsData === 'object' && !Array.isArray(metricsData)) {
    const entries = Object.entries(metricsData as Record<string, unknown>);
    const timeSeriesEntries = entries.filter(
      ([, v]) => Array.isArray(v) && (v as unknown[]).every((x) => typeof x === 'number')
    );

    if (timeSeriesEntries.length > 0) {
      const maxLen = Math.max(...timeSeriesEntries.map(([, v]) => (v as number[]).length));
      const syntheticTimestamps = Array.from({ length: maxLen }, (_, i) => i);
      const remapped = remapTimestamps(
        syntheticTimestamps.map((i) => i * 1000),
        windowMs
      );

      for (let i = 0; i < maxLen; i++) {
        const ts = remapped[i];
        if (!ts) continue;

        for (const [key, values] of timeSeriesEntries) {
          const val = (values as number[])[i];
          if (val === undefined || val === null) continue;

          const parts = key.split('_');
          const metricType = parts.pop() ?? key;
          const serviceName = parts.join('_') || key;

          const doc: Record<string, unknown> = {
            '@timestamp': new Date(ts).toISOString(),
            'host.name': serviceName,
            'service.name': serviceName,
            'event.module': 'system',
            'event.dataset': 'rcaeval-re3-metrics',
            'labels.dataset': 'rcaeval-re3-ob',
            'labels.metric_name': metricType,
          };

          if (metricType === 'cpu') {
            doc['system.cpu.total.norm.pct'] = Math.min(val / 100, 1);
          } else if (metricType === 'mem' || metricType === 'memory') {
            if (val <= 1) {
              doc['system.memory.actual.used.pct'] = val;
            }
          }

          docs.push(doc);
        }
      }
    }
  }

  return docs;
}

function buildMetricsFromDataCsv(csvFile: string, windowMs: number): Record<string, unknown>[] {
  const csvText = readFileSync(csvFile, 'utf-8');
  const rows = parseCsv(csvText);
  if (rows.length === 0) return [];

  const hasTime = rows[0].time !== undefined;
  const rawTimesMs = hasTime
    ? rows.map((row) => parseInt(row.time, 10) * 1000)
    : rows.map((_, i) => i * 1000);
  const remapped = remapTimestamps(rawTimesMs, windowMs);

  const headers = Object.keys(rows[0]).filter((h) => h !== 'time' && h !== '');
  const columnMeta = headers.map((h) => {
    const firstUnderscore = h.indexOf('_');
    if (firstUnderscore <= 0) return { header: h, service: h, metric: 'value' };
    return {
      header: h,
      service: h.slice(0, firstUnderscore),
      metric: h.slice(firstUnderscore + 1).toLowerCase(),
    };
  });

  const docs: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const ts = remapped[i];
    if (!ts) continue;

    const serviceMetrics = new Map<string, Record<string, number>>();
    for (const { header, service, metric } of columnMeta) {
      const val = parseFloat(rows[i][header]);
      if (isNaN(val)) continue;
      let metrics = serviceMetrics.get(service);
      if (!metrics) {
        metrics = {};
        serviceMetrics.set(service, metrics);
      }
      metrics[metric] = val;
    }

    for (const [service, metrics] of serviceMetrics) {
      const doc: Record<string, unknown> = {
        '@timestamp': new Date(ts).toISOString(),
        'host.name': service,
        'service.name': service,
        'event.module': 'system',
        'event.dataset': 'rcaeval-re3-metrics',
        'labels.dataset': 'rcaeval-re3-ob',
      };

      if (metrics.cpu !== undefined) {
        doc['system.cpu.total.norm.pct'] = Math.min(metrics.cpu / 100, 1);
      }
      if (metrics.mem !== undefined || metrics.memory !== undefined) {
        const memVal = metrics.mem ?? metrics.memory!;
        doc['system.memory.actual.used.pct'] = Math.min(memVal, 1);
      }
      if (metrics.diskio !== undefined) {
        doc['system.diskio.read.bytes'] = metrics.diskio;
      }
      if (metrics.socket !== undefined) {
        doc['system.network.in.bytes'] = metrics.socket;
      }
      if (metrics.error !== undefined) {
        doc['service.errors'] = metrics.error;
      }
      if (metrics.workload !== undefined) {
        doc['service.throughput'] = metrics.workload;
      }
      const latencyKeys = Object.keys(metrics).filter((k) => k.startsWith('latency-'));
      for (const k of latencyKeys) {
        const percentile = k.slice('latency-'.length);
        doc[`service.latency.p${percentile}`] = metrics[k];
      }

      docs.push(doc);
    }
  }

  return docs;
}

// ---------------------------------------------------------------------------
// Index template mappings
// ---------------------------------------------------------------------------

const RCAEVAL_MAPPINGS = {
  '@timestamp': { type: 'date' as const },
  message: { type: 'text' as const },
  log: { properties: { level: { type: 'keyword' as const } } },
  service: { properties: { name: { type: 'keyword' as const } } },
  container: { properties: { name: { type: 'keyword' as const } } },
  kubernetes: {
    properties: {
      pod: { properties: { name: { type: 'keyword' as const } } },
      node: { properties: { name: { type: 'keyword' as const } } },
    },
  },
  labels: {
    properties: {
      dataset: { type: 'keyword' as const },
    },
  },
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = getOpts();
  const windowMs = parseDuration(opts.window);

  if (opts.clean) {
    const client = await createEsClient(opts.esUrl);
    await deleteDataStream(client, LOG_INDEX_NAME);
    await deleteDataStream(client, METRIC_INDEX_NAME);
    await deleteApmDataStreams(client);
    console.log('Cleaned: deleted RCAEval data streams and APM data');
    if (!opts.caseName) return;
  }

  const dataDir = await ensureDataset(opts.source);

  if (!opts.caseName) {
    const cases = discoverCases(dataDir);
    console.log(`Available cases (${cases.length}):`);
    for (const c of cases) {
      console.log(`  ${c.faultService}_${c.faultType}/${c.instance}`);
    }
    console.log(`\nRun with --case <name> to ingest a single case.`);
    return;
  }

  const ingestTraces = !opts.skipTraces;
  const ingestMetrics = !opts.skipMetrics;

  console.log('RCAEval RE3-OB → Elasticsearch Ingestion');
  console.log('=========================================');
  console.log(`ES URL:   ${maskPassword(opts.esUrl)}`);
  console.log(`Window:   ${opts.window} (${windowMs}ms)`);
  console.log(`Signals:  logs${ingestTraces ? ', traces' : ''}${ingestMetrics ? ', metrics' : ''}`);
  console.log(`Case:     ${opts.caseName}`);
  if (ingestTraces) console.log(`OTLP:     ${opts.otlpEndpoint}`);
  if (opts.maxTraceRows)
    console.log(`Max rows: ${opts.maxTraceRows.toLocaleString()} trace rows per file`);
  console.log();

  // Verify EDOT Collector is reachable before starting
  if (ingestTraces) {
    const otlpReachable = await checkOtlpEndpoint(opts.otlpEndpoint);
    if (!otlpReachable) {
      console.error(
        `EDOT Collector not reachable at ${opts.otlpEndpoint}.\n` +
          'Start it with: node scripts/edot_collector.js\n' +
          'Or skip traces with: --skip-traces'
      );
      process.exit(1);
    }
    console.log(`EDOT Collector reachable at ${opts.otlpEndpoint}`);
  }

  console.log();

  const cases = discoverCases(dataDir, opts.caseName);
  if (cases.length === 0) {
    console.error('No cases found. Check the --case or --source arguments.');
    process.exit(1);
  }

  console.log(`Found ${cases.length} cases:`);
  for (const c of cases) {
    console.log(`  ${c.faultService}_${c.faultType}/${c.instance}`);
  }
  console.log();

  const client = await createEsClient(opts.esUrl);
  console.log();

  // Set up log index
  await ensureIndexTemplate(client, LOG_TEMPLATE_NAME, LOG_INDEX_NAME, RCAEVAL_MAPPINGS);
  await deleteDataStream(client, LOG_INDEX_NAME);

  // Set up metric index
  if (ingestMetrics) {
    await ensureIndexTemplate(
      client,
      METRIC_TEMPLATE_NAME,
      METRIC_INDEX_NAME,
      INFRA_METRIC_MAPPINGS
    );
    await deleteDataStream(client, METRIC_INDEX_NAME);
  }
  console.log();

  let totalLogs = 0;
  let totalTraceSpans = 0;
  let totalMetrics = 0;

  for (const caseInfo of cases) {
    const label = `${caseInfo.faultService}_${caseInfo.faultType}/${caseInfo.instance}`;
    console.log(`Processing ${label}...`);

    // --- Logs ---
    const logDocs = buildDocuments(caseInfo, windowMs);
    if (logDocs.length > 0) {
      console.log(`  Logs: ${logDocs.length} documents`);
      const indexed = await bulkIndex(client, logDocs, LOG_INDEX_NAME, { label: `${label}/logs` });
      totalLogs += indexed;
    }

    // --- Metrics ---
    if (ingestMetrics) {
      const metricDocs = buildMetricDocuments(caseInfo, windowMs);
      if (metricDocs.length > 0) {
        console.log(`  Metrics: ${metricDocs.length} documents`);
        const indexed = await bulkIndex(client, metricDocs, METRIC_INDEX_NAME, {
          label: `${label}/metrics`,
        });
        totalMetrics += indexed;
      } else {
        console.log('  Metrics: no metric data found');
      }
    }

    // --- Traces ---
    if (ingestTraces) {
      const traceSpans = buildTraceSpans(caseInfo, windowMs, opts.maxTraceRows);
      const spanCount = traceSpans.reduce((sum, rs) => sum + rs.spans.length, 0);
      if (spanCount > 0) {
        console.log(`  Traces: ${spanCount} spans across ${traceSpans.length} services`);
        const exported = await exportTracesViaOtlp(traceSpans, opts.otlpEndpoint, {
          label,
          datasetId: DATASET_ID,
        });
        totalTraceSpans += exported;
      } else {
        console.log('  Traces: no traces.csv found');
      }
    }

    console.log();
  }

  if (totalLogs > 0) {
    await restoreAndRefresh(client, LOG_INDEX_NAME);
  }
  if (totalMetrics > 0) {
    await restoreAndRefresh(client, METRIC_INDEX_NAME);
  }

  console.log('\nComplete:');
  console.log(`  Logs:    ${totalLogs.toLocaleString()} documents → ${LOG_INDEX_NAME}`);
  if (ingestTraces) {
    console.log(
      `  Traces:  ${totalTraceSpans.toLocaleString()} spans → OTLP → traces-apm*/metrics-apm*`
    );
  }
  if (ingestMetrics) {
    console.log(`  Metrics: ${totalMetrics.toLocaleString()} documents → ${METRIC_INDEX_NAME}`);
  }
  printVerifyCommands(opts.esUrl, 'logs-rcaeval.*,metrics-rcaeval.*');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
