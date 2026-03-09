/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

/**
 * Downloads and ingests the OpenRCA benchmark dataset into Elasticsearch.
 *
 * OpenRCA (ICLR'25) contains telemetry from microservice failure scenarios
 * across Bank and Market systems, with ground-truth root causes.
 * See https://github.com/microsoft/OpenRCA
 *
 * The script downloads Bank.zip and Market.zip (~5 GB total) from Google
 * Drive on first run and caches them locally. Timestamps are remapped
 * into a recent window so the data works with default time ranges.
 *
 * Ingests three signal types:
 *   - Logs    → bulk indexed into logs-openrca.{system}-default
 *   - Traces  → sent via OTLP to EDOT Collector (produces APM data)
 *   - Metrics → bulk indexed into metrics-openrca.{system}-default
 *
 * Usage:
 *   npx tsx scripts/ingest_openrca.ts                         # list available cases
 *   npx tsx scripts/ingest_openrca.ts --case bank/2021_03_04  # ingest a single case
 *   npx tsx scripts/ingest_openrca.ts --case market/2022_03_20
 *   npx tsx scripts/ingest_openrca.ts --skip-traces --skip-metrics  # logs only
 *
 * Options:
 *   --case <system/date>      Case to ingest, e.g. "bank/2021_03_04" or "market/2022_03_20"
 *   --es-url <url>            Elasticsearch URL (default: http://elastic:changeme@localhost:9200)
 *   --source <path>           Local OpenRCA directory instead of downloading
 *   --clean                   Delete all OpenRCA data streams and exit (removes all ingested data)
 *   --systems <list>          Comma-separated systems: bank,market (default: both)
 *   --date <date>             Single date directory, e.g. "2022_03_20" (default: all)
 *   --window <duration>       Time window to map data into, relative to now (default: 1h)
 *   --otlp-endpoint <url>     OTLP endpoint for traces (default: http://localhost:4318)
 *   --skip-traces             Skip trace ingestion (no EDOT Collector required)
 *   --skip-metrics            Skip metric ingestion
 *   --max-trace-rows <N>      Limit trace rows per file via uniform sampling (default: 200000)
 */

import { createReadStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import globby from 'globby';
import Papa from 'papaparse';
import type { Client } from '@elastic/elasticsearch';
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
  generateHexId,
  toHexId,
  INFRA_METRIC_MAPPINGS,
} from './ingest_utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GDRIVE_FILE_IDS: Record<string, string> = {
  'Bank.zip': '1enBrdPT3wLG94ITGbSOwUFg9fkLR-16R',
  'Market.zip': '1aDbqFHhYGgywLDfq54O7Ln8wgiv-BqGJ',
};

const DEFAULT_OTLP_ENDPOINT = 'http://localhost:4318';
const DEFAULT_MAX_TRACE_ROWS = 200_000;
const DATASET_ID: DatasetId = 'openrca';

const PLUGIN_ROOT = resolvePath(__dirname, '..');
const DATASETS_DIR = join(PLUGIN_ROOT, 'datasets');
const OPENRCA_DIR = join(DATASETS_DIR, 'openrca');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface OpenRcaArgs extends BaseArgs {
  systems?: string;
  date?: string;
  case?: string;
  source?: string;
  'otlp-endpoint'?: string;
  'max-trace-rows'?: string;
}

function getOpts() {
  const raw = parseArgs<OpenRcaArgs>(
    ['systems', 'date', 'case', 'source', 'otlp-endpoint', 'max-trace-rows'],
    {
      systems: 'bank,market',
      'otlp-endpoint': DEFAULT_OTLP_ENDPOINT,
    }
  );

  let systems = (raw.systems ?? 'bank,market').split(',').map((s) => s.trim().toLowerCase());
  let date = raw.date;

  if (raw.case) {
    const slash = raw.case.indexOf('/');
    if (slash === -1) {
      throw new Error(
        `Invalid --case "${raw.case}". Expected format: bank/2021_03_04 or market/2022_03_20`
      );
    }
    systems = [raw.case.slice(0, slash).toLowerCase()];
    date = raw.case.slice(slash + 1);
  }

  const hasExplicitCase = Boolean(raw.case || raw.date);

  const rawMaxRows = raw['max-trace-rows'];
  const maxTraceRows = rawMaxRows ? parseInt(rawMaxRows, 10) : DEFAULT_MAX_TRACE_ROWS;

  return {
    esUrl: raw.esUrl,
    window: raw.window,
    systems,
    date,
    hasExplicitCase,
    source: raw.source,
    otlpEndpoint: raw['otlp-endpoint'] ?? DEFAULT_OTLP_ENDPOINT,
    maxTraceRows: !isNaN(maxTraceRows) && maxTraceRows > 0 ? maxTraceRows : undefined,
    clean: process.argv.includes('--clean'),
    skipLogs: process.argv.includes('--skip-logs'),
    skipTraces: process.argv.includes('--skip-traces'),
    skipMetrics: process.argv.includes('--skip-metrics'),
  };
}

// ---------------------------------------------------------------------------
// Download and extract
// ---------------------------------------------------------------------------

async function ensureDataset(source?: string): Promise<string> {
  if (source) {
    if (!existsSync(source)) throw new Error(`Source directory does not exist: ${source}`);
    return source;
  }

  const hasBank = existsSync(join(OPENRCA_DIR, 'Bank'));
  const hasMarket = existsSync(join(OPENRCA_DIR, 'Market'));
  if (hasBank || hasMarket) {
    console.log(`Using cached dataset at ${OPENRCA_DIR}`);
    return OPENRCA_DIR;
  }

  mkdirSync(OPENRCA_DIR, { recursive: true });

  let extracted = false;
  for (const system of ['Bank', 'Market']) {
    const zipPath = join(OPENRCA_DIR, `${system}.zip`);
    if (existsSync(zipPath)) {
      console.log(`Extracting ${system}.zip...`);
      await extractZip(zipPath, OPENRCA_DIR);
      extracted = true;
    }
  }
  if (extracted) {
    console.log(`Dataset ready at ${OPENRCA_DIR}`);
    return OPENRCA_DIR;
  }

  console.log('Downloading OpenRCA dataset from Google Drive (~5 GB)...');
  console.log('This may take a while depending on your connection.\n');

  for (const [fileName, fileId] of Object.entries(GDRIVE_FILE_IDS)) {
    const zipPath = join(OPENRCA_DIR, fileName);
    if (!existsSync(zipPath)) {
      const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
      console.log(`Downloading ${fileName}...`);
      await downloadFile(url, zipPath);
    }

    const systemDir = fileName.replace('.zip', '');
    if (!existsSync(join(OPENRCA_DIR, systemDir))) {
      console.log(`Extracting ${fileName}...`);
      await extractZip(zipPath, OPENRCA_DIR);
    }
  }

  console.log(`Dataset ready at ${OPENRCA_DIR}`);
  return OPENRCA_DIR;
}

// ---------------------------------------------------------------------------
// System configurations
// ---------------------------------------------------------------------------

interface SystemConfig {
  name: string;
  telemetryRoots: string[];
  logIndexName: string;
  metricIndexName: string;
}

const SYSTEMS: Record<string, SystemConfig> = {
  bank: {
    name: 'Bank',
    telemetryRoots: ['Bank'],
    logIndexName: 'logs-openrca.bank-default',
    metricIndexName: 'metrics-openrca.bank-default',
  },
  market: {
    name: 'Market',
    telemetryRoots: ['Market/cloudbed-1', 'Market/cloudbed-2'],
    logIndexName: 'logs-openrca.market-default',
    metricIndexName: 'metrics-openrca.market-default',
  },
};

// ---------------------------------------------------------------------------
// Case discovery
// ---------------------------------------------------------------------------

function discoverCases(dataDir: string): string[] {
  const cases: string[] = [];
  for (const [key, config] of Object.entries(SYSTEMS)) {
    for (const root of config.telemetryRoots) {
      const telDir = join(dataDir, root, 'telemetry');
      if (!existsSync(telDir)) continue;
      const dates = globby
        .sync(join(telDir, '*'), { onlyDirectories: true })
        .map((d) => d.split('/').pop()!)
        .filter(Boolean)
        .sort();
      for (const d of dates) {
        cases.push(`${key}/${d}`);
      }
    }
  }
  return [...new Set(cases)].sort();
}

// ---------------------------------------------------------------------------
// Discover log CSV files
// ---------------------------------------------------------------------------

function discoverLogFiles(dataDir: string, config: SystemConfig, dateFilter?: string): string[] {
  const dateGlob = dateFilter ?? '*';
  const patterns = config.telemetryRoots.map((root) =>
    join(dataDir, root, 'telemetry', dateGlob, 'log', '*.csv')
  );
  return globby.sync(patterns).sort();
}

// ---------------------------------------------------------------------------
// Discover metric CSV files
// ---------------------------------------------------------------------------

function discoverMetricFiles(dataDir: string, config: SystemConfig, dateFilter?: string): string[] {
  const dateGlob = dateFilter ?? '*';
  const patterns = config.telemetryRoots.map((root) =>
    join(dataDir, root, 'telemetry', dateGlob, 'metric', '*.csv')
  );
  return globby.sync(patterns).sort();
}

// ---------------------------------------------------------------------------
// Discover trace CSV files
// ---------------------------------------------------------------------------

function discoverTraceFiles(dataDir: string, config: SystemConfig, dateFilter?: string): string[] {
  const dateGlob = dateFilter ?? '*';
  const patterns = config.telemetryRoots.map((root) =>
    join(dataDir, root, 'telemetry', dateGlob, 'trace', '*.csv')
  );
  return globby.sync(patterns).sort();
}

// ---------------------------------------------------------------------------
// Build OTLP trace spans from OpenRCA trace CSVs
//
// OpenRCA traces are typically dependency-graph style with columns like:
//   timestamp, cmdb_id (source), target_cmdb_id (target), latency, etc.
// We synthesize proper trace/span IDs from these edges.
// ---------------------------------------------------------------------------

const TRACE_FLUSH_SIZE = 5000;

function detectTraceFormat(file: string): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    Papa.parse(createReadStream(file, 'utf-8'), {
      header: true,
      skipEmptyLines: true,
      step: ({ data }: { data: Record<string, string> }, parser: Papa.Parser) => {
        if (resolved) return;
        const headers = Object.keys(data);
        const hasTraceId =
          headers.includes('traceID') ||
          headers.includes('traceId') ||
          headers.includes('trace_id');
        const hasSpanId =
          headers.includes('spanID') || headers.includes('spanId') || headers.includes('span_id');
        resolved = true;
        parser.abort();
        resolve(hasTraceId && hasSpanId);
      },
      complete: () => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      },
    });
  });
}

interface PreScanResult {
  spanIdToService: Map<string, string>;
  totalRows: number;
}

function preScanDistributedTraceFile(file: string): Promise<PreScanResult> {
  const map = new Map<string, string>();
  let totalRows = 0;
  return new Promise((resolve, reject) => {
    Papa.parse(createReadStream(file, 'utf-8'), {
      header: true,
      skipEmptyLines: true,
      step: ({ data }: { data: Record<string, string> }) => {
        totalRows++;
        const rawSpanId = data.spanID || data.spanId || data.span_id || '';
        const serviceName = data.serviceName || data.service_name || data.cmdb_id || '';
        if (rawSpanId && serviceName) {
          map.set(rawSpanId, serviceName);
        }
      },
      complete: () => resolve({ spanIdToService: map, totalRows }),
      error: (err: Error) => reject(err),
    });
  });
}

function countCsvRows(file: string): Promise<number> {
  let count = 0;
  return new Promise((resolve, reject) => {
    Papa.parse(createReadStream(file, 'utf-8'), {
      header: true,
      skipEmptyLines: true,
      step: () => {
        count++;
      },
      complete: () => resolve(count),
      error: (err: Error) => reject(err),
    });
  });
}

async function streamTraceSpansFromFile(
  file: string,
  range: TimestampRange,
  windowMs: number,
  now: number,
  systemKey: string,
  otlpEndpoint: string,
  label: string,
  maxTraceRows?: number
): Promise<number> {
  let totalExported = 0;
  let buffer: Record<string, string>[] = [];

  const isDistributed = await detectTraceFormat(file);

  let spanIdToService: Map<string, string> | undefined;
  let totalRows: number | undefined;
  let sampleInterval = 1;

  if (isDistributed) {
    console.log(`  [${label}] Pre-scanning for span→service mapping...`);
    const preScan = await preScanDistributedTraceFile(file);
    spanIdToService = preScan.spanIdToService;
    totalRows = preScan.totalRows;
    console.log(
      `  [${label}] Found ${spanIdToService.size.toLocaleString()} spans across services (${totalRows.toLocaleString()} rows)`
    );
  } else if (maxTraceRows) {
    totalRows = await countCsvRows(file);
    console.log(`  [${label}] Total rows: ${totalRows.toLocaleString()}`);
  }

  if (maxTraceRows && totalRows && totalRows > maxTraceRows) {
    sampleInterval = Math.ceil(totalRows / maxTraceRows);
    console.log(
      `  [${label}] Sampling every ${sampleInterval}th row (${maxTraceRows.toLocaleString()} of ${totalRows.toLocaleString()})`
    );
  }

  let rowIndex = 0;

  async function flushBuffer(): Promise<number> {
    if (buffer.length === 0) return 0;
    const rows = buffer;
    buffer = [];

    const resourceSpans = isDistributed
      ? buildDistributedTraces(rows, range, windowMs, now, spanIdToService!)
      : buildGraphTraces(rows, range, windowMs, now, systemKey);

    const spanCount = resourceSpans.reduce((sum, rs) => sum + rs.spans.length, 0);
    if (spanCount > 0) {
      const exported = await exportTracesViaOtlp(resourceSpans, otlpEndpoint, {
        label,
        datasetId: DATASET_ID,
      });
      return exported;
    }
    return 0;
  }

  await new Promise<void>((done, reject) => {
    Papa.parse(createReadStream(file, 'utf-8'), {
      header: true,
      skipEmptyLines: true,
      step: ({ data }: { data: Record<string, string> }, parser: Papa.Parser) => {
        const currentRow = rowIndex++;

        if (sampleInterval > 1 && currentRow % sampleInterval !== 0) {
          return;
        }

        const ts = parseInt(data.timestamp, 10);
        if (!isNaN(ts) && ts > 1e12) {
          data.timestamp = String(Math.round(ts / 1000));
        }

        buffer.push(data);

        if (buffer.length >= TRACE_FLUSH_SIZE) {
          parser.pause();
          flushBuffer()
            .then((exported) => {
              totalExported += exported;
              process.stdout.write(
                `  [${label}] Exported ${totalExported.toLocaleString()} trace spans\r`
              );
              parser.resume();
            })
            .catch(reject);
        }
      },
      complete: () => {
        flushBuffer()
          .then((exported) => {
            totalExported += exported;
            done();
          })
          .catch(reject);
      },
      error: (err: Error) => reject(err),
    });
  });

  if (totalExported > 0) console.log();
  return totalExported;
}

function buildDistributedTraces(
  rows: Record<string, string>[],
  range: TimestampRange,
  windowMs: number,
  now: number,
  spanIdToService: Map<string, string>
): OtlpResourceSpans[] {
  // For service_destination metrics, EDOT needs CLIENT (exit) spans with
  // peer.service pointing to the target. We use the pre-built spanIdToService
  // map to detect cross-service parent-child edges: when a span's parent
  // belongs to a different service, we emit a synthetic CLIENT span under the
  // parent's service with peer.service set to this span's service.
  const spansByService = new Map<string, OtlpSpan[]>();

  function pushSpan(service: string, span: OtlpSpan) {
    const existing = spansByService.get(service);
    if (existing) {
      existing.push(span);
    } else {
      spansByService.set(service, [span]);
    }
  }

  for (const row of rows) {
    const sec = parseInt(row.timestamp, 10);
    if (isNaN(sec)) continue;

    const remappedMs = remapTimestamp(sec, range, windowMs, now);
    const durationUs = parseInt(row.duration || '0', 10);
    const startNano = BigInt(remappedMs) * 1_000_000n;
    const endNano = startNano + BigInt(durationUs) * 1000n;

    const rawTraceId = row.traceID || row.traceId || row.trace_id || '';
    const rawSpanId = row.spanID || row.spanId || row.span_id || '';
    const rawParentId =
      row.parentSpanID ||
      row.parentSpanId ||
      row.parent_span_id ||
      row.parent_span ||
      row.parent_id ||
      '';
    const traceId = toHexId(rawTraceId, 32);
    const spanId = toHexId(rawSpanId, 16);
    const serviceName = row.serviceName || row.service_name || row.cmdb_id || 'unknown';
    const operationName = row.operationName || row.operation_name || row.methodName || 'request';

    const isRoot = !rawParentId || rawParentId === '0';
    const parentService = isRoot ? undefined : spanIdToService.get(rawParentId);
    const isCrossService = parentService !== undefined && parentService !== serviceName;

    // Determine span kind:
    // - Root spans → SERVER (entry point)
    // - Cross-service child → SERVER (receiving a call from another service)
    // - Same-service child → INTERNAL
    let kind: number;
    if (isRoot || isCrossService) {
      kind = 2; // SERVER
    } else {
      kind = 0; // INTERNAL
    }

    const span: OtlpSpan = {
      traceId,
      spanId,
      ...(rawParentId && rawParentId !== '0' ? { parentSpanId: toHexId(rawParentId, 16) } : {}),
      name: operationName,
      kind,
      startTimeUnixNano: startNano.toString(),
      endTimeUnixNano: endNano.toString(),
      attributes: [{ key: 'span.name', value: { stringValue: operationName } }],
      status: { code: 1 },
    };
    pushSpan(serviceName, span);

    // When this span is a cross-service entry, synthesize a CLIENT (exit) span
    // under the calling service so EDOT produces service_destination metrics.
    if (isCrossService) {
      const exitSpanId = generateHexId(16);
      const exitName = `call ${serviceName}`;
      const exitSpan: OtlpSpan = {
        traceId,
        spanId: exitSpanId,
        parentSpanId: toHexId(rawParentId, 16),
        name: exitName,
        kind: 3, // CLIENT
        startTimeUnixNano: startNano.toString(),
        endTimeUnixNano: endNano.toString(),
        attributes: [
          { key: 'span.name', value: { stringValue: exitName } },
          { key: 'peer.service', value: { stringValue: serviceName } },
        ],
        status: { code: 1 },
      };
      pushSpan(parentService, exitSpan);
    }
  }

  return Array.from(spansByService.entries()).map(([svc, spans]) => ({
    serviceName: svc,
    spans,
  }));
}

function buildGraphTraces(
  rows: Record<string, string>[],
  range: TimestampRange,
  windowMs: number,
  now: number,
  systemKey: string
): OtlpResourceSpans[] {
  // OpenRCA graph-style traces: each row is an edge (source → target) with latency.
  // We create a SERVER span on the source and a CLIENT (exit) span also on the source
  // that represents the outgoing call to the target. The CLIENT span carries
  // peer.service so EDOT can derive span.destination.service.resource and produce
  // service_destination metrics.
  const spansByService = new Map<string, OtlpSpan[]>();

  function pushSpan(service: string, span: OtlpSpan) {
    const existing = spansByService.get(service);
    if (existing) {
      existing.push(span);
    } else {
      spansByService.set(service, [span]);
    }
  }

  for (const row of rows) {
    const sec = parseInt(row.timestamp, 10);
    if (isNaN(sec)) continue;

    const remappedMs = remapTimestamp(sec, range, windowMs, now);

    const source = row.cmdb_id || row.source || row.source_cmdb_id || '';
    const target = row.target_cmdb_id || row.target || '';
    if (!source) continue;

    const latencyMs = parseFloat(row.value || row.latency || row.avg_time || '0');
    const durationUs = Math.round(latencyMs * 1000);

    const traceId = generateHexId(32);
    const rootSpanId = generateHexId(16);
    const startNano = BigInt(remappedMs) * 1_000_000n;
    const endNano = startNano + BigInt(durationUs) * 1000n;

    const rootName = target ? `${source} → ${target}` : `${source}`;
    const rootSpan: OtlpSpan = {
      traceId,
      spanId: rootSpanId,
      name: rootName,
      kind: 2, // SERVER
      startTimeUnixNano: startNano.toString(),
      endTimeUnixNano: endNano.toString(),
      attributes: [
        { key: 'openrca.system', value: { stringValue: systemKey } },
        { key: 'span.name', value: { stringValue: rootName } },
      ],
      status: { code: 1 },
    };
    pushSpan(source, rootSpan);

    if (target) {
      const exitSpanId = generateHexId(16);
      const exitName = `call ${target}`;
      const exitSpan: OtlpSpan = {
        traceId,
        spanId: exitSpanId,
        parentSpanId: rootSpanId,
        name: exitName,
        kind: 3, // CLIENT — exit span from source to target
        startTimeUnixNano: startNano.toString(),
        endTimeUnixNano: endNano.toString(),
        attributes: [
          { key: 'span.name', value: { stringValue: exitName } },
          { key: 'peer.service', value: { stringValue: target } },
        ],
        status: { code: 1 },
      };
      pushSpan(source, exitSpan);
    }
  }

  return Array.from(spansByService.entries()).map(([serviceName, spans]) => ({
    serviceName,
    spans,
  }));
}

// ---------------------------------------------------------------------------
// Build ECS metric documents from OpenRCA metric CSVs
//
// OpenRCA metric CSVs typically have: timestamp, cmdb_id, kpi_name, value
// ---------------------------------------------------------------------------

function buildMetricDoc(
  kpiName: string,
  cmdbId: string,
  val: number,
  remappedMs: number,
  systemKey: string
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    '@timestamp': new Date(remappedMs).toISOString(),
    'host.name': cmdbId,
    'service.name': cmdbId,
    'event.module': 'system',
    'event.dataset': `openrca-${systemKey}-metrics`,
    'labels.dataset': 'openrca',
    'labels.system': systemKey,
    'labels.metric_name': kpiName,
  };

  const kpiLower = kpiName.toLowerCase();

  if (kpiLower.includes('cpucpuutil')) {
    doc['system.cpu.total.norm.pct'] = val / 100;
  } else if (kpiLower.includes('memusedmemperc')) {
    doc['system.memory.actual.used.pct'] = val / 100;
  } else if (kpiLower.includes('netkbtotalpersec')) {
    doc['system.network.in.bytes'] = val * 1024;
  } else if (kpiLower.includes('dskreadwrite') || kpiLower.includes('dskbps')) {
    doc['system.diskio.read.bytes'] = val;
  }

  return doc;
}

async function streamAndIndexMetricFile(
  client: Client,
  file: string,
  indexName: string,
  range: TimestampRange,
  windowMs: number,
  now: number,
  systemKey: string,
  label: string
): Promise<number> {
  let buffer: Record<string, unknown>[] = [];
  let totalIndexed = 0;
  let formatDetected = false;
  let isLongFormat = false;
  let metricCols: string[] = [];

  async function flushBuffer(parser?: Papa.Parser): Promise<void> {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    const indexed = await bulkIndex(client, batch, indexName, {
      label: `${label}/metrics`,
      batchSize: STREAM_BATCH_SIZE,
    });
    totalIndexed += indexed;
    process.stdout.write(`  [${label}] Metric docs indexed: ${totalIndexed.toLocaleString()}\r`);
    if (parser) parser.resume();
  }

  await new Promise<void>((done, reject) => {
    Papa.parse(createReadStream(file, 'utf-8'), {
      header: true,
      skipEmptyLines: true,
      step: ({ data }: { data: Record<string, string> }, parser: Papa.Parser) => {
        if (!formatDetected) {
          const headers = Object.keys(data);
          const hasKpiName = headers.includes('kpi_name') || headers.includes('metric_name');
          const hasCmdbId = headers.includes('cmdb_id');
          const hasValue = headers.includes('value');
          isLongFormat = hasKpiName && hasCmdbId && hasValue;
          metricCols = headers.filter((h) => h !== 'timestamp');
          formatDetected = true;
        }

        const sec = parseInt(data.timestamp, 10);
        if (isNaN(sec)) return;
        const remappedMs = remapTimestamp(sec, range, windowMs, now);

        if (isLongFormat) {
          const val = parseFloat(data.value);
          if (isNaN(val)) return;
          const kpiName = (data.kpi_name || data.metric_name || '').toLowerCase();
          buffer.push(buildMetricDoc(kpiName, data.cmdb_id, val, remappedMs, systemKey));
        } else {
          for (const col of metricCols) {
            const val = parseFloat(data[col]);
            if (isNaN(val)) continue;
            const dotIdx = col.indexOf('.');
            const cmdbId = dotIdx > 0 ? col.slice(0, dotIdx) : col;
            const metricName = dotIdx > 0 ? col.slice(dotIdx + 1).toLowerCase() : 'value';
            buffer.push(buildMetricDoc(metricName, cmdbId, val, remappedMs, systemKey));
          }
        }

        if (buffer.length >= STREAM_BATCH_SIZE) {
          parser.pause();
          flushBuffer(parser).catch(reject);
        }
      },
      complete: () => {
        flushBuffer()
          .then(() => done())
          .catch(reject);
      },
      error: (err: Error) => reject(err),
    });
  });

  if (totalIndexed > 0) console.log();
  return totalIndexed;
}

// ---------------------------------------------------------------------------
// Timestamp scanning
// ---------------------------------------------------------------------------

interface TimestampRange {
  minSec: number;
  maxSec: number;
}

async function scanTimestampRange(files: string[]): Promise<TimestampRange> {
  let minSec = Infinity;
  let maxSec = -Infinity;

  for (const file of files) {
    await new Promise<void>((done) => {
      Papa.parse(createReadStream(file, 'utf-8'), {
        header: true,
        skipEmptyLines: true,
        step: ({ data }: { data: Record<string, string> }) => {
          let ts = parseInt(data.timestamp, 10);
          if (!isNaN(ts)) {
            if (ts > 1e12) ts = Math.round(ts / 1000);
            if (ts < minSec) minSec = ts;
            if (ts > maxSec) maxSec = ts;
          }
        },
        complete: () => done(),
      });
    });
  }

  return { minSec, maxSec };
}

function remapTimestamp(sec: number, range: TimestampRange, windowMs: number, now: number): number {
  const originalRange = (range.maxSec - range.minSec) * 1000 || 1;
  const windowStart = now - windowMs;
  return Math.round(windowStart + (((sec - range.minSec) * 1000) / originalRange) * windowMs);
}

// ---------------------------------------------------------------------------
// Index template mappings
// ---------------------------------------------------------------------------

const OPENRCA_MAPPINGS = {
  '@timestamp': { type: 'date' as const },
  message: { type: 'text' as const },
  log: { properties: { level: { type: 'keyword' as const } } },
  service: { properties: { name: { type: 'keyword' as const } } },
  event: { properties: { dataset: { type: 'keyword' as const } } },
  kubernetes: {
    properties: {
      pod: { properties: { name: { type: 'keyword' as const } } },
    },
  },
  labels: {
    properties: {
      dataset: { type: 'keyword' as const },
      system: { type: 'keyword' as const },
    },
  },
};

// ---------------------------------------------------------------------------
// Streaming document building and indexing (handles files larger than V8 string limit)
// ---------------------------------------------------------------------------

const STREAM_BATCH_SIZE = 5000;

async function streamAndIndexFile(
  client: Client,
  file: string,
  indexName: string,
  range: TimestampRange,
  windowMs: number,
  now: number,
  systemKey: string,
  label: string
): Promise<number> {
  const isMarket = systemKey === 'market';
  let buffer: Record<string, unknown>[] = [];
  let totalIndexed = 0;
  let pendingFlush: Promise<void> | null = null;

  async function flushBuffer(parser?: Papa.Parser): Promise<void> {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    const indexed = await bulkIndex(client, batch, indexName, {
      label,
      batchSize: STREAM_BATCH_SIZE,
    });
    totalIndexed += indexed;
    process.stdout.write(`  [${label}] Total indexed: ${totalIndexed.toLocaleString()}\r`);
    if (parser) parser.resume();
  }

  await new Promise<void>((done, reject) => {
    Papa.parse(createReadStream(file, 'utf-8'), {
      header: true,
      skipEmptyLines: true,
      step: ({ data }: { data: Record<string, string> }, parser: Papa.Parser) => {
        const message = data.value;
        if (!message) return;

        const sec = parseInt(data.timestamp, 10);
        if (isNaN(sec)) return;

        const ts = remapTimestamp(sec, range, windowMs, now);
        const doc: Record<string, unknown> = {
          '@timestamp': new Date(ts).toISOString(),
          message,
          'log.level': inferLogLevel(message),
          'service.name': data.cmdb_id,
          'event.dataset': data.log_name,
          'labels.dataset': 'openrca',
          'labels.system': systemKey,
        };

        if (isMarket && data.cmdb_id) {
          doc['kubernetes.pod.name'] = data.cmdb_id;
        }

        buffer.push(doc);

        if (buffer.length >= STREAM_BATCH_SIZE) {
          parser.pause();
          pendingFlush = flushBuffer(parser).catch(reject);
        }
      },
      complete: () => {
        const finish = async () => {
          if (pendingFlush) await pendingFlush;
          await flushBuffer();
          done();
        };
        finish().catch(reject);
      },
      error: (err: Error) => reject(err),
    });
  });

  return totalIndexed;
}

// ---------------------------------------------------------------------------
// Ground truth
// ---------------------------------------------------------------------------

function printGroundTruth(dataDir: string, config: SystemConfig, dateFilter?: string): void {
  const queryPaths = [
    ...config.telemetryRoots.map((root) => join(dataDir, root, 'query.csv')),
    join(dataDir, config.name, 'query.csv'),
  ];

  const dateMatch = dateFilter?.replace(/_/g, '-');

  for (const qPath of queryPaths) {
    if (!existsSync(qPath)) continue;

    const rows = parseCsv(readFileSync(qPath, 'utf-8'));
    if (rows.length === 0) continue;

    const filtered = dateMatch
      ? rows.filter((row) => {
          const text = row.scoring_points ?? row.instruction ?? row.query ?? '';
          return text.includes(dateMatch);
        })
      : rows;

    if (filtered.length === 0) continue;

    console.log(`\n  Ground truth (${filtered.length} tasks) from ${qPath}:`);
    for (const row of filtered) {
      const text =
        row.scoring_points ?? row.instruction ?? row.query ?? Object.values(row)[0] ?? '';
      console.log(`    - ${text.slice(0, 300)}${text.length > 300 ? '...' : ''}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = getOpts();

  if (opts.clean) {
    const client = await createEsClient(opts.esUrl);
    for (const config of Object.values(SYSTEMS)) {
      await deleteDataStream(client, config.logIndexName);
      await deleteDataStream(client, config.metricIndexName);
    }
    await deleteApmDataStreams(client);
    console.log('Cleaned: deleted all OpenRCA data streams and APM data');
    if (!opts.hasExplicitCase) return;
  }

  const windowMs = parseDuration(opts.window);
  const ingestLogs = !opts.skipLogs;
  const ingestTraces = !opts.skipTraces;
  const ingestMetrics = !opts.skipMetrics;

  console.log('OpenRCA → Elasticsearch Ingestion');
  console.log('=================================');
  console.log(`ES URL:   ${maskPassword(opts.esUrl)}`);
  console.log(`Window:   ${opts.window} (${windowMs}ms)`);
  console.log(
    `Signals:  ${ingestLogs ? 'logs' : ''}${ingestTraces ? ', traces' : ''}${
      ingestMetrics ? ', metrics' : ''
    }`
  );
  console.log(`Systems:  ${opts.systems.join(', ')}`);
  if (opts.date) console.log(`Date:     ${opts.date}`);
  if (ingestTraces) console.log(`OTLP:     ${opts.otlpEndpoint}`);
  if (opts.maxTraceRows)
    console.log(`Max rows: ${opts.maxTraceRows.toLocaleString()} trace rows per file`);
  console.log();

  const dataDir = await ensureDataset(opts.source);

  if (!opts.hasExplicitCase) {
    const availableCases = discoverCases(dataDir);
    console.log(`Available cases (${availableCases.length}):`);
    for (const c of availableCases) {
      console.log(`  ${c}`);
    }
    console.log(`\nRun with --case <name> to ingest a single case.`);
    return;
  }

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

  const client = await createEsClient(opts.esUrl);
  console.log();

  const now = Date.now();
  let totalLogs = 0;
  let totalTraceSpans = 0;
  let totalMetrics = 0;

  for (const systemKey of opts.systems) {
    const config = SYSTEMS[systemKey];
    if (!config) {
      console.error(
        `Unknown system: "${systemKey}". Available: ${Object.keys(SYSTEMS).join(', ')}`
      );
      continue;
    }

    console.log(`Processing ${config.name}...`);

    // --- Discover all telemetry files ---
    const logFiles = ingestLogs ? discoverLogFiles(dataDir, config, opts.date) : [];
    const traceFiles = ingestTraces ? discoverTraceFiles(dataDir, config, opts.date) : [];
    const metricFiles = ingestMetrics ? discoverMetricFiles(dataDir, config, opts.date) : [];

    console.log(
      `  Found: ${logFiles.length} log, ${traceFiles.length} trace, ${metricFiles.length} metric CSV files`
    );

    // Scan timestamps -- prefer log files, fall back to trace/metric files
    let range: TimestampRange | null = null;
    if (logFiles.length > 0 || traceFiles.length > 0 || metricFiles.length > 0) {
      console.log('  Scanning timestamps...');
      const filesToScan =
        logFiles.length > 0 ? logFiles : traceFiles.length > 0 ? traceFiles : metricFiles;
      range = await scanTimestampRange(filesToScan);
    }

    if (!range || range.minSec === Infinity) {
      console.log('  No valid timestamps found. Skipping.');
      continue;
    }

    // --- Logs ---
    if (logFiles.length > 0) {
      await ensureIndexTemplate(
        client,
        `openrca-${systemKey}-logs`,
        config.logIndexName,
        OPENRCA_MAPPINGS
      );
      await deleteDataStream(client, config.logIndexName);

      let systemLogs = 0;
      for (const file of logFiles) {
        const label = file.replace(dataDir + '/', '');
        const indexed = await streamAndIndexFile(
          client,
          file,
          config.logIndexName,
          range,
          windowMs,
          now,
          systemKey,
          label
        );
        if (indexed > 0) {
          console.log(`  ${label}: ${indexed.toLocaleString()} log docs indexed`);
        }
        systemLogs += indexed;
      }
      totalLogs += systemLogs;
    }

    // --- Metrics ---
    if (metricFiles.length > 0) {
      await ensureIndexTemplate(
        client,
        `openrca-${systemKey}-metrics`,
        config.metricIndexName,
        INFRA_METRIC_MAPPINGS
      );
      await deleteDataStream(client, config.metricIndexName);

      let systemMetrics = 0;
      for (const file of metricFiles) {
        const label = file.replace(dataDir + '/', '');
        const indexed = await streamAndIndexMetricFile(
          client,
          file,
          config.metricIndexName,
          range,
          windowMs,
          now,
          systemKey,
          label
        );
        systemMetrics += indexed;
        if (indexed > 0) {
          console.log(`  ${label}: ${indexed.toLocaleString()} metric docs indexed`);
        }
      }
      totalMetrics += systemMetrics;
    }

    // --- Traces ---
    if (traceFiles.length > 0) {
      console.log(`  Ingesting ${traceFiles.length} trace files via OTLP...`);
      for (const file of traceFiles) {
        const label = file.replace(dataDir + '/', '');
        const exported = await streamTraceSpansFromFile(
          file,
          range,
          windowMs,
          now,
          systemKey,
          opts.otlpEndpoint,
          label,
          opts.maxTraceRows
        );
        totalTraceSpans += exported;
        if (exported > 0) {
          console.log(`  ${label}: ${exported.toLocaleString()} spans exported`);
        }
      }
    }

    printGroundTruth(dataDir, config, opts.date);
    console.log();
  }

  if (totalLogs > 0) {
    await restoreAndRefresh(client, 'logs-openrca.*');
  }
  if (totalMetrics > 0) {
    await restoreAndRefresh(client, 'metrics-openrca.*');
  }

  console.log('\nComplete:');
  console.log(`  Logs:    ${totalLogs.toLocaleString()} documents → logs-openrca.*`);
  if (ingestTraces) {
    console.log(
      `  Traces:  ${totalTraceSpans.toLocaleString()} spans → OTLP → traces-apm*/metrics-apm*`
    );
  }
  if (ingestMetrics) {
    console.log(`  Metrics: ${totalMetrics.toLocaleString()} documents → metrics-openrca.*`);
  }
  printVerifyCommands(opts.esUrl, 'logs-openrca.*,metrics-openrca.*');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
