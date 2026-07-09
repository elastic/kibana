/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import axios from 'axios';
import https from 'https';
import { Client } from '@elastic/elasticsearch';
import moment from 'moment';
import {
  readKibanaConfig,
  makeUpSummary,
  makeDownSummary,
} from '@kbn/observability-synthetics-test-data';

interface CliArgs {
  live: boolean;
}

const parseArgs = (): CliArgs => {
  const argv = process.argv.slice(2);
  return {
    live: argv.includes('--live'),
  };
};

const cliArgs = parseArgs();

const getKibanaConnection = () => {
  let config: Record<string, any> = {};
  try {
    config = readKibanaConfig();
  } catch {
    // fall through to defaults
  }
  // YAML supports both `server: { basePath }` and the flat `server.basePath`
  // form — we honour both. Same goes for host/port. Env overrides win.
  const flat = (key: string) => config[key];
  const host = process.env.KIBANA_HOST ?? config.server?.host ?? flat('server.host') ?? '127.0.0.1';
  const resolvedHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  const port = process.env.KIBANA_PORT ?? config.server?.port ?? flat('server.port') ?? 5601;
  // `server.basePath` is empty when not configured; in dev mode `yarn start`
  // injects a random 3-letter base path at runtime that we then have to
  // discover from a redirect (see `discoverBasePath`).
  const configBasePath: string =
    process.env.KIBANA_BASE_PATH ?? config.server?.basePath ?? flat('server.basePath') ?? '';
  const sslEnabled =
    config.server?.ssl?.enabled ?? flat('server.ssl.enabled') ?? flat('server.ssl') === true;
  const protocol = process.env.KIBANA_PROTOCOL ?? (sslEnabled ? 'https' : 'http');
  let kbnUsername =
    process.env.KIBANA_USERNAME ?? config.elasticsearch?.username ?? flat('elasticsearch.username');
  if (kbnUsername === 'kibana_system_user' || !kbnUsername) {
    kbnUsername = 'elastic';
  }
  const kbnPassword =
    process.env.KIBANA_PASSWORD ??
    config.elasticsearch?.password ??
    flat('elasticsearch.password') ??
    'changeme';
  return {
    username: kbnUsername as string,
    password: kbnPassword as string,
    origin: `${protocol}://${resolvedHost}:${port}`,
    configBasePath,
    isHttps: protocol === 'https',
  };
};

const { username, password, origin, configBasePath, isHttps } = getKibanaConnection();
const auth = { username, password };
const headers = { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' };
const httpsAgent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined;

// When `server.basePath` is not configured, Kibana dev mode generates a random
// base path on startup (e.g. `/abc`). Discover it by following the redirect
// from `GET /`, which Kibana points to `/<basePath>/spaces/enter` (or `/login`,
// etc.). Same trick `kbn-synthtrace`'s `get_service_urls` uses.
const WELL_KNOWN_TOP_LEVEL =
  /^\/(api|app|internal|spaces|s|bundles|core|ui|translations|login|logout|security)(\/|$)/;

const discoverBasePath = async (): Promise<string> => {
  try {
    const response = await axios.request({
      method: 'HEAD',
      url: `${origin}/`,
      maxRedirects: 0,
      validateStatus: () => true,
      httpsAgent,
    });
    const location: string | undefined = response.headers?.location;
    if (!location) return '';
    const pathname = location.startsWith('http') ? new URL(location).pathname : location;
    const stripped = pathname
      .replace(/\/spaces\/enter\/?$/, '')
      .replace(/\/spaces\/space_selector\/?$/, '')
      .replace(/\/login\b.*$/, '')
      .replace(/\/app\/.*$/, '')
      .replace(/\/$/, '');
    if (!stripped.startsWith('/') || WELL_KNOWN_TOP_LEVEL.test(stripped + '/')) return '';
    return stripped;
  } catch {
    return '';
  }
};

let kibanaUrlPromise: Promise<string> | undefined;
const getKibanaUrl = () => {
  if (!kibanaUrlPromise) {
    kibanaUrlPromise = (async () => {
      let basePath = configBasePath;
      if (!basePath) {
        const discovered = await discoverBasePath();
        if (discovered) {
          console.log(`  ✓ Discovered Kibana basePath: ${discovered}`);
          basePath = discovered;
        }
      }
      return `${origin}${basePath}`;
    })();
  }
  return kibanaUrlPromise;
};

const request = async (method: string, path: string, data?: any) => {
  const kibanaUrl = await getKibanaUrl();
  try {
    const response = await axios.request({
      data,
      method,
      url: `${kibanaUrl}${path}`,
      auth,
      headers,
      httpsAgent,
    });
    return response.data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ?? JSON.stringify(error?.response?.data) ?? error?.message;
    throw new Error(msg);
  }
};

const buildEsClient = () => {
  try {
    const config = readKibanaConfig();
    const node = config.elasticsearch?.hosts;
    if (node) {
      const rawUser = config.elasticsearch?.username;
      const esUsername = rawUser === 'kibana_system_user' || !rawUser ? 'elastic' : rawUser;
      const esPassword = config.elasticsearch?.password;
      const verificationMode = config.elasticsearch?.ssl?.verificationMode;
      return new Client({
        node: Array.isArray(node) ? node[0] : node,
        auth: esUsername && esPassword ? { username: esUsername, password: esPassword } : undefined,
        tls: verificationMode === 'none' ? { rejectUnauthorized: false } : undefined,
      });
    }
  } catch {
    // fall through
  }
  return new Client({
    node: 'http://localhost:9200',
    auth: { username: 'elastic', password: 'changeme' },
  });
};

const esClient = buildEsClient();

interface MonitorInfo {
  configId: string;
  name: string;
  type: string;
  schedule: { number: string; unit: string };
  locations: Array<{ id: string; label: string }>;
  tags: string[];
  urls: string;
  projectId: string;
}

const fetchAllMonitors = async (): Promise<MonitorInfo[]> => {
  const result = await request('get', '/api/synthetics/monitors?perPage=200');
  return (result.monitors ?? []).map((m: any) => ({
    configId: m.config_id,
    name: m.name,
    type: m.type,
    schedule: {
      number: String(m.schedule?.number ?? '5'),
      unit: String(m.schedule?.unit ?? 'm'),
    },
    locations: (m.locations ?? []).map((l: any) => ({ id: l.id, label: l.label })),
    tags: m.tags ?? [],
    urls: m.urls ?? m.hosts ?? '',
    projectId: m.project_id ?? '',
  }));
};

const indexSummaryDoc = async (index: string, document: Record<string, any>) => {
  await esClient.index({ index, document, refresh: false });
};

const SCHEDULE_UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
};

const scheduleToMs = ({ number, unit }: { number: string; unit: string }) => {
  const factor = SCHEDULE_UNIT_MS[unit] ?? 60_000;
  const num = Number(number);
  return (Number.isFinite(num) && num > 0 ? num : 5) * factor;
};

const isMonitorSkipped = (monitor: MonitorInfo) =>
  monitor.locations.length === 0 || monitor.name.toLowerCase().includes('disabled');

const buildSummaryDoc = (
  monitor: MonitorInfo,
  location: { id: string; label: string },
  ts: moment.Moment
) => {
  const isDown = monitor.name.toLowerCase().includes('down');
  const durationUs = isDown ? randomInt(50000, 200000) : randomInt(80000, 500000);
  const overrides = {
    name: monitor.name,
    timestamp: ts.toISOString(),
    monitorId: monitor.configId,
    configId: monitor.configId,
    location: { id: location.id, label: location.label },
  };
  const doc = isDown ? makeDownSummary(overrides) : makeUpSummary(overrides);
  (doc as any).monitor = {
    ...(doc as any).monitor,
    type: monitor.type,
    id: monitor.configId,
    name: monitor.name,
    duration: { us: durationUs },
    timespan: {
      lt: ts.clone().add(5, 'minutes').toISOString(),
      gte: ts.clone().subtract(5, 'minutes').toISOString(),
    },
  };
  const stateId = `${monitor.configId}-${location.id}-summary-${ts.valueOf()}`;
  const stateDurationMs = isDown ? randomInt(300000, 7200000) : 0;
  (doc as any).state = {
    ...(doc as any).state,
    id: stateId,
    started_at: ts
      .clone()
      .subtract(isDown ? stateDurationMs : 1000, 'milliseconds')
      .toISOString(),
    duration_ms: stateDurationMs,
  };
  (doc as any).data_stream = {
    namespace: 'default',
    type: 'synthetics',
    dataset: monitor.type === 'browser' ? 'browser' : monitor.type,
  };
  (doc as any).tags = monitor.tags;
  (doc as any).meta = { space_id: 'default' };
  if (monitor.projectId) {
    (doc as any).monitor = {
      ...(doc as any).monitor,
      project: { id: monitor.projectId },
    };
  }
  const index = `synthetics-${monitor.type === 'browser' ? 'browser' : monitor.type}-default`;
  return { doc, index, isDown };
};

const ingestSummaryData = async (monitors: MonitorInfo[]) => {
  const now = moment();
  let upCount = 0;
  let downCount = 0;

  for (const monitor of monitors) {
    if (isMonitorSkipped(monitor)) continue;
    const isDown = monitor.name.toLowerCase().includes('down');

    for (const location of monitor.locations) {
      const numDocs = isDown ? 5 : randomInt(8, 15);

      for (let i = 0; i < numDocs; i++) {
        const minutesAgo = i * 3 + randomInt(0, 2);
        const ts = now.clone().subtract(minutesAgo, 'minutes');
        const { doc, index } = buildSummaryDoc(monitor, location, ts);
        await indexSummaryDoc(index, doc);
        if (isDown) {
          downCount++;
        } else {
          upCount++;
        }
      }
    }
  }

  await esClient.indices.refresh({ index: 'synthetics-*' });
  return { upCount, downCount };
};

const runLiveMode = async (monitors: MonitorInfo[]) => {
  const active = monitors.filter((m) => !isMonitorSkipped(m));
  if (active.length === 0) {
    console.log('  (no eligible monitors to keep live)');
    return;
  }

  console.log(`\n=== Live mode: ${active.length} monitor(s), Ctrl-C to stop ===`);

  let total = 0;
  const timers: NodeJS.Timeout[] = [];

  const tick = async (monitor: MonitorInfo) => {
    const now = moment();
    for (const location of monitor.locations) {
      const { doc, index } = buildSummaryDoc(monitor, location, now);
      try {
        await indexSummaryDoc(index, doc);
        total++;
      } catch (err: any) {
        console.error(
          `  ✗ Failed to index for "${monitor.name}" @ ${location.label}: ${err?.message}`
        );
      }
    }
  };

  for (const monitor of active) {
    const intervalMs = scheduleToMs(monitor.schedule);
    console.log(
      `  · "${monitor.name}" every ${intervalMs / 1000}s × ${monitor.locations.length} location(s)`
    );
    // Stagger first tick slightly so we don't fire everything at once.
    const initialDelay = randomInt(500, 3_000);
    timers.push(
      setTimeout(() => {
        void tick(monitor);
        timers.push(setInterval(() => void tick(monitor), intervalMs));
      }, initialDelay)
    );
  }

  // Periodic refresh + status so docs become searchable promptly.
  const refreshTimer = setInterval(() => {
    esClient.indices.refresh({ index: 'synthetics-*' }).catch(() => {});
  }, 5_000);
  const statusTimer = setInterval(() => {
    console.log(`  ✓ Live docs ingested so far: ${total}`);
  }, 30_000);
  timers.push(refreshTimer, statusTimer);

  await new Promise<void>((resolve) => {
    const stop = (signal: string) => {
      console.log(`\n  Received ${signal}, stopping live mode (sent ${total} docs).`);
      timers.forEach((t) => clearInterval(t as unknown as NodeJS.Timeout));
      timers.forEach((t) => clearTimeout(t as unknown as NodeJS.Timeout));
      resolve();
    };
    process.once('SIGINT', () => stop('SIGINT'));
    process.once('SIGTERM', () => stop('SIGTERM'));
  });
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ---------------------------------------------------------------------------
// Error data generation for the Errors Overview page (PR #211205)
// ---------------------------------------------------------------------------

interface ErrorCategory {
  getMessage: (variant: number) => string;
  statusCode?: number;
  domain: string;
  errorType: string;
  onlyCurrentPeriod?: boolean;
  intermittent?: boolean;
}

const ERROR_CATEGORIES: Record<string, ErrorCategory> = {
  'Bad URL': {
    getMessage: (v) =>
      [
        'DNS resolution failed: could not resolve host this-url-does-not-exist-12345.example.com',
        'DNS lookup error: NXDOMAIN for this-url-does-not-exist-12345.example.com',
        'DNS resolution timeout: no response from DNS server for this-url-does-not-exist-12345.example.com',
      ][v % 3],
    domain: 'this-url-does-not-exist-12345.example.com',
    errorType: 'io',
  },
  'DNS Failure': {
    getMessage: (v) =>
      [
        'DNS resolution failed: could not resolve host nonexistent-api.example.net',
        'DNS lookup error: NXDOMAIN for nonexistent-api.example.net',
        'DNS resolution timeout: no response from DNS server for nonexistent-api.example.net',
      ][v % 3],
    domain: 'nonexistent-api.example.net',
    errorType: 'io',
  },
  'Body Mismatch': {
    getMessage: () =>
      'body mismatch: expected string "this-string-will-never-be-found-xyz" not found in response body',
    statusCode: 200,
    domain: 'www.google.com',
    errorType: 'validate',
  },
  'API Gateway 503': {
    getMessage: (v) =>
      [
        'received status code 503 Service Unavailable expecting [200] from api-gateway.example.com',
        'HTTP 503: api-gateway.example.com is temporarily unavailable',
        'server error: api-gateway.example.com responded with status 503',
      ][v % 3],
    statusCode: 503,
    domain: 'api-gateway.example.com',
    errorType: 'validate',
  },
  'SSL Expired': {
    getMessage: (v) =>
      [
        'x509: certificate has expired for checkout.example.com',
        'SSL handshake failed: certificate verification error for checkout.example.com',
        'TLS error: certificate not valid after 2024-01-15 for checkout.example.com',
      ][v % 3],
    domain: 'checkout.example.com',
    errorType: 'io',
    onlyCurrentPeriod: true,
  },
  'Auth 401': {
    getMessage: (v) =>
      [
        'received status code 401 Unauthorized expecting [200] from secure-api.example.com',
        'authentication failed: secure-api.example.com returned 401 Unauthorized',
        'HTTP 401: invalid credentials for secure-api.example.com/api/v1/auth',
      ][v % 3],
    statusCode: 401,
    domain: 'secure-api.example.com',
    errorType: 'validate',
    onlyCurrentPeriod: true,
  },
  'Rate Limited 429': {
    getMessage: (v) =>
      [
        'received status code 429 Too Many Requests expecting [200] from rate-api.example.com',
        'HTTP 429: rate limit exceeded on rate-api.example.com',
        'rate limited: rate-api.example.com returned 429 after exceeding quota',
      ][v % 3],
    statusCode: 429,
    domain: 'rate-api.example.com',
    errorType: 'validate',
    intermittent: true,
  },
  'Payment Service': {
    getMessage: (v) =>
      [
        'received status code 502 Bad Gateway expecting [200] from payment.example.com',
        'HTTP 502: upstream connection error from payment.example.com',
        'server error: payment.example.com responded with status 502',
      ][v % 3],
    statusCode: 502,
    domain: 'payment.example.com',
    errorType: 'validate',
  },
  'Bad Port': {
    getMessage: (v) =>
      [
        'connection refused: tcp dial localhost:59999 connection was refused',
        'connection error: failed to connect to localhost:59999 - ECONNREFUSED',
        'tcp connection failed: localhost:59999 actively refused the connection',
      ][v % 3],
    domain: 'localhost',
    errorType: 'io',
  },
  Database: {
    getMessage: (v) =>
      [
        'connection refused: tcp dial db-primary.internal:5432 connection was refused',
        'connection timeout: exceeded 10000ms waiting for db-primary.internal:5432',
        'tcp connection failed: db-primary.internal:5432 actively refused the connection',
      ][v % 3],
    domain: 'db-primary.internal',
    errorType: 'io',
  },
  'Bad Host': {
    getMessage: (v) =>
      [
        'ping 192.0.2.1: destination host unreachable',
        'ICMP: no route to host 192.0.2.1',
        'ping 192.0.2.1: request timed out',
      ][v % 3],
    domain: '',
    errorType: 'io',
  },
  'CDN Node': {
    getMessage: (v) =>
      [
        'ping 203.0.113.50: destination host unreachable',
        'ICMP: no route to host 203.0.113.50',
        'ping 203.0.113.50: request timed out',
      ][v % 3],
    domain: '',
    errorType: 'io',
  },
  'Bad Assertion': {
    getMessage: (v) =>
      [
        'waiting for selector "#nonexistent-element-xyz" failed: timeout 5000ms exceeded',
        'element "#nonexistent-element-xyz" not found within 5000ms',
        'selector "#nonexistent-element-xyz" did not match any elements',
      ][v % 3],
    domain: 'www.google.com',
    errorType: 'validate',
  },
  'Login Timeout': {
    getMessage: (v) =>
      [
        'waiting for selector "#login-form" failed: timeout 30000ms exceeded at app.example.com',
        'navigation timeout: page app.example.com/login did not load within 30000ms',
        'element "#login-form" not found within 30000ms at app.example.com',
      ][v % 3],
    domain: 'app.example.com',
    errorType: 'validate',
  },
  'Checkout Error': {
    getMessage: (v) =>
      [
        "JavaScript error: TypeError: Cannot read properties of null (reading 'submit') at shop.example.com/checkout",
        'JS runtime error: Uncaught TypeError at shop.example.com/checkout - null reference',
        'page error: TypeError: null is not an object at shop.example.com/checkout',
      ][v % 3],
    domain: 'shop.example.com',
    errorType: 'validate',
    onlyCurrentPeriod: true,
  },
};

const findErrorCategory = (monitorName: string): ErrorCategory | undefined => {
  for (const [keyword, category] of Object.entries(ERROR_CATEGORIES)) {
    if (monitorName.includes(keyword)) {
      return category;
    }
  }
  return undefined;
};

const generateHourSlots = (minHour: number, maxHour: number, count: number): number[] => {
  const available = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, available.length)).sort((a, b) => a - b);
};

interface ErrorDocParams {
  monitor: MonitorInfo;
  location: { id: string; label: string };
  timestamp: string;
  stateId: string;
  stateDurationMs: number;
  stateStartedAt: string;
  errorMessage: string;
  errorType: string;
  domain: string;
  statusCode?: number;
  durationUs: number;
}

const makeErrorDoc = ({
  monitor,
  location,
  timestamp,
  stateId,
  stateDurationMs,
  stateStartedAt,
  errorMessage,
  errorType,
  domain,
  statusCode,
  durationUs,
}: ErrorDocParams): Record<string, any> => {
  const checkGroup = `${monitor.configId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const doc: Record<string, any> = {
    '@timestamp': timestamp,
    summary: { up: 0, down: 1, final_attempt: true },
    monitor: {
      duration: { us: durationUs },
      origin: 'ui',
      ip: '0.0.0.0',
      name: monitor.name,
      fleet_managed: true,
      check_group: checkGroup,
      timespan: {
        lt: moment(timestamp).add(5, 'minutes').toISOString(),
        gte: moment(timestamp).subtract(5, 'minutes').toISOString(),
      },
      id: monitor.configId,
      type: monitor.type,
      status: 'down',
    },
    config_id: monitor.configId,
    state: {
      id: stateId,
      duration_ms: stateDurationMs,
      started_at: stateStartedAt,
      up: 0,
      down: 1,
      checks: 1,
      ends: null,
      flap_history: [],
      status: 'down',
    },
    error: {
      message: errorMessage,
      type: errorType,
    },
    observer: {
      name: location.id,
      geo: {
        name: location.label,
        location: '0.0, 0.0',
      },
    },
    tags: monitor.tags,
    data_stream: {
      namespace: 'default',
      type: 'synthetics',
      dataset: monitor.type === 'browser' ? 'browser' : monitor.type,
    },
    meta: { space_id: 'default' },
    agent: {
      name: 'docker-fleet-server',
      id: 'dd39a87d-a1e5-45a1-8dd9-e78d6a1391c6',
      type: 'heartbeat',
      ephemeral_id: '264bb432-93f6-4aa6-a14d-266c53b9e7c7',
      version: '8.7.0',
    },
    ecs: { version: '8.0.0' },
    event: {
      agent_id_status: 'verified',
      ingested: timestamp,
      dataset: monitor.type === 'browser' ? 'browser' : monitor.type,
    },
  };

  if (domain) {
    doc.url = {
      scheme: 'https',
      port: 443,
      domain,
      full: `https://${domain}`,
    };
  }

  if (statusCode !== undefined) {
    doc.http = {
      response: {
        status_code: statusCode,
        body: { bytes: 0 },
      },
    };
  }

  if (monitor.projectId) {
    doc.monitor.project = { id: monitor.projectId };
  }

  return doc;
};

/**
 * Generates comprehensive error documents for the Errors Overview page.
 *
 * Covers: error stats, error groups (categorize_text), error insights
 * (domains, tags, status codes, monitor types, emerging terms),
 * top failing monitors (by errors, rate, downtime), errors over time chart,
 * and pattern classification (persistent / intermittent / new).
 *
 * Data spans current period (0-24h ago) and previous period (24-48h ago)
 * for trend comparison with delta indicators.
 */
const ingestErrorData = async (monitors: MonitorInfo[]) => {
  const now = moment();
  let errorDocCount = 0;

  for (const monitor of monitors) {
    if (!monitor.name.toLowerCase().includes('down')) continue;
    if (monitor.locations.length === 0) continue;

    const category = findErrorCategory(monitor.name);
    if (!category) continue;

    const index = `synthetics-${monitor.type === 'browser' ? 'browser' : monitor.type}-default`;

    for (const location of monitor.locations) {
      // --- Current period (last 24 hours) ---
      let currentHours: number[];

      if (category.onlyCurrentPeriod) {
        // "new" pattern: only in the last ~6 hours so classifyPattern sees no early-bucket errors
        currentHours = generateHourSlots(0, 5, randomInt(3, 5));
      } else if (category.intermittent) {
        // "intermittent" pattern: scattered across 24h but < 75% bucket coverage
        currentHours = generateHourSlots(0, 23, randomInt(6, 12));
      } else {
        // "persistent" pattern: errors in >= 75% of hourly buckets
        currentHours = generateHourSlots(0, 23, randomInt(18, 23));
      }

      let msgVariant = 0;
      for (const hoursAgo of currentHours) {
        const stateId = `${monitor.configId}-${location.id}-cur-${hoursAgo}`;
        const stateDurationMs = randomInt(60000, 1800000);
        const docsInHour = randomInt(1, 3);

        for (let d = 0; d < docsInHour; d++) {
          const minutesAgo = hoursAgo * 60 + randomInt(0, 55);
          const ts = now.clone().subtract(minutesAgo, 'minutes');

          const doc = makeErrorDoc({
            monitor,
            location,
            timestamp: ts.toISOString(),
            stateId,
            stateDurationMs,
            stateStartedAt: ts.clone().subtract(stateDurationMs, 'milliseconds').toISOString(),
            errorMessage: category.getMessage(msgVariant++),
            errorType: category.errorType,
            domain: category.domain,
            statusCode: category.statusCode,
            durationUs: randomInt(50000, 500000),
          });

          await indexSummaryDoc(index, doc);
          errorDocCount++;
        }
      }

      // --- Previous period (24-48 hours ago) for trend comparison ---
      if (!category.onlyCurrentPeriod) {
        const prevHours = category.intermittent
          ? generateHourSlots(24, 47, randomInt(4, 8))
          : generateHourSlots(24, 47, randomInt(14, 20));

        for (const hoursAgo of prevHours) {
          const stateId = `${monitor.configId}-${location.id}-prev-${hoursAgo}`;
          const stateDurationMs = randomInt(60000, 1200000);
          const docsInHour = randomInt(1, 2);

          for (let d = 0; d < docsInHour; d++) {
            const minutesAgo = hoursAgo * 60 + randomInt(0, 55);
            const ts = now.clone().subtract(minutesAgo, 'minutes');

            const doc = makeErrorDoc({
              monitor,
              location,
              timestamp: ts.toISOString(),
              stateId,
              stateDurationMs,
              stateStartedAt: ts.clone().subtract(stateDurationMs, 'milliseconds').toISOString(),
              errorMessage: category.getMessage(msgVariant++),
              errorType: category.errorType,
              domain: category.domain,
              statusCode: category.statusCode,
              durationUs: randomInt(50000, 500000),
            });

            await indexSummaryDoc(index, doc);
            errorDocCount++;
          }
        }
      }
    }
  }

  await esClient.indices.refresh({ index: 'synthetics-*' });
  return { errorDocCount };
};

const createMonitor = async (monitor: Record<string, any>) => {
  try {
    const result = await request('post', '/api/synthetics/monitors', monitor);

    console.log(`  ✓ Created "${monitor.name}" (${monitor.type})`);
    return result;
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log(`  ↻ Skipped "${monitor.name}" (already exists)`);
      return null;
    }
    throw error;
  }
};

const ensureAgentPolicy = async (name: string) => {
  const existing = await request(
    'get',
    `/api/fleet/agent_policies?kuery=ingest-agent-policies.name:"${encodeURIComponent(
      name
    )}"&perPage=1`
  );
  if (existing?.items?.length > 0) {
    console.log(`  ↻ Reusing existing agent policy "${name}"`);
    return existing.items[0];
  }
  const result = await request('post', '/api/fleet/agent_policies', {
    name,
    description: '',
    namespace: 'default',
    monitoring_enabled: ['logs', 'metrics', 'traces'],
    inactivity_timeout: 1209600,
    is_protected: false,
  });
  return result.item;
};

const getPrivateLocations = async (): Promise<Array<{ id: string; label: string }>> => {
  return await request('get', '/api/synthetics/private_locations');
};

const ensurePrivateLocation = async (
  label: string,
  agentPolicyId: string,
  geo: { lat: number; lon: number } = { lat: 0, lon: 0 }
) => {
  const existing = await getPrivateLocations();
  const found = existing.find((loc: any) => loc.label === label);
  if (found) {
    console.log(`  ↻ Reusing existing private location "${label}"`);
    return found;
  }
  return await request('post', '/api/synthetics/private_locations', {
    label,
    agentPolicyId,
    geo,
  });
};

const commonFields = (overrides: Record<string, any>) => ({
  enabled: true,
  alert: { status: { enabled: true }, tls: { enabled: true } },
  'service.name': '',
  config_id: '',
  namespace: 'default',
  origin: 'ui',
  journey_id: '',
  hash: '',
  id: '',
  max_attempts: 2,
  revision: 1,
  ...overrides,
});

const httpMonitor = (overrides: Record<string, any>) =>
  commonFields({
    type: 'http',
    form_monitor_type: 'http',
    schedule: { number: '3', unit: 'm' },
    timeout: '16',
    __ui: { is_tls_enabled: false },
    max_redirects: '0',
    'url.port': null,
    password: '',
    proxy_url: '',
    proxy_headers: {},
    'check.response.body.negative': [],
    'check.response.body.positive': [],
    'check.response.json': [],
    'response.include_body': 'on_error',
    'check.response.headers': {},
    'response.include_headers': true,
    'check.response.status': [],
    'check.request.body': { type: 'text', value: '' },
    'check.request.headers': {},
    'check.request.method': 'GET',
    username: '',
    mode: 'any',
    'response.include_body_max_bytes': '1024',
    ipv4: true,
    ipv6: true,
    'ssl.certificate_authorities': '',
    'ssl.certificate': '',
    'ssl.key': '',
    'ssl.key_passphrase': '',
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    ...overrides,
  });

const tcpMonitor = (overrides: Record<string, any>) =>
  commonFields({
    type: 'tcp',
    form_monitor_type: 'tcp',
    schedule: { number: '3', unit: 'm' },
    timeout: '16',
    __ui: { is_tls_enabled: false },
    hosts: 'localhost:9200',
    'url.port': null,
    proxy_url: '',
    proxy_use_local_resolver: false,
    'check.receive': '',
    'check.send': '',
    mode: 'any',
    ipv4: true,
    ipv6: true,
    'ssl.certificate_authorities': '',
    'ssl.certificate': '',
    'ssl.key': '',
    'ssl.key_passphrase': '',
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    ...overrides,
  });

const icmpMonitor = (overrides: Record<string, any>) =>
  commonFields({
    type: 'icmp',
    form_monitor_type: 'icmp',
    schedule: { number: '3', unit: 'm' },
    timeout: '16',
    hosts: 'localhost',
    wait: '1',
    mode: 'any',
    ipv4: true,
    ipv6: true,
    ...overrides,
  });

const browserMonitor = (overrides: Record<string, any>) =>
  commonFields({
    type: 'browser',
    form_monitor_type: 'single',
    schedule: { number: '10', unit: 'm' },
    timeout: '30',
    __ui: { script_source: { is_generated_script: false, file_name: '' } },
    params: '',
    'url.port': null,
    'source.inline.script': `step('Go to page', async () => {
  await page.goto('https://www.google.com');
});`,
    'source.project.content': '',
    playwright_options: '',
    screenshots: 'on',
    synthetics_args: [],
    'filter_journeys.match': '',
    'filter_journeys.tags': [],
    ignore_https_errors: false,
    throttling: {
      id: 'custom',
      label: 'Custom',
      value: { download: '5', upload: '3', latency: '20' },
    },
    'ssl.certificate_authorities': '',
    'ssl.certificate': '',
    'ssl.key': '',
    'ssl.key_passphrase': '',
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    ...overrides,
  });

export const generateMonitors = async () => {
  console.log('=== Setting up infrastructure ===');

  const policyUS = await ensureAgentPolicy('Test Policy US');
  const policyEU = await ensureAgentPolicy('Test Policy EU');
  const policyAP = await ensureAgentPolicy('Test Policy AP');
  const policySA = await ensureAgentPolicy('Test Policy SA');
  const policyAU = await ensureAgentPolicy('Test Policy AU');

  const locUS = await ensurePrivateLocation('US East (Private)', policyUS.id, {
    lat: 40.7128,
    lon: -74.006,
  });
  const locEU = await ensurePrivateLocation('EU West (Private)', policyEU.id, {
    lat: 51.5074,
    lon: -0.1278,
  });
  const locAP = await ensurePrivateLocation('Asia Pacific (Private)', policyAP.id, {
    lat: 35.6762,
    lon: 139.6503,
  });
  const locSA = await ensurePrivateLocation('South America (Private)', policySA.id, {
    lat: -23.5505,
    lon: -46.6333,
  });
  const locAU = await ensurePrivateLocation('Australia (Private)', policyAU.id, {
    lat: -33.8688,
    lon: 151.2093,
  });

  const toLoc = (loc: { id: string; label: string }) => ({
    id: loc.id,
    label: loc.label,
    isServiceManaged: false,
  });
  const privateLocUS = toLoc(locUS);
  const privateLocEU = toLoc(locEU);
  const privateLocAP = toLoc(locAP);
  const privateLocSA = toLoc(locSA);
  const privateLocAU = toLoc(locAU);
  const allLocations = [privateLocUS, privateLocEU, privateLocAP, privateLocSA, privateLocAU];
  const threeLocations = [privateLocUS, privateLocEU, privateLocAP];
  const fourLocations = [privateLocUS, privateLocEU, privateLocAP, privateLocSA];

  console.log(`  ✓ Private locations: ${allLocations.map((l) => `"${l.label}"`).join(', ')}`);

  // ---------------------------------------------------------------------------
  // HTTP monitors — various URLs, tags, schedules, locations
  // ---------------------------------------------------------------------------

  console.log('\n=== Creating HTTP monitors ===');

  await createMonitor(
    httpMonitor({
      name: 'Google Homepage',
      urls: 'https://www.google.com',
      tags: ['search', 'production', 'critical'],
      schedule: { number: '1', unit: 'm' },
      locations: allLocations,
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'GitHub Status',
      urls: 'https://www.githubstatus.com',
      tags: ['devtools', 'production'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'Elastic.co',
      urls: 'https://www.elastic.co',
      tags: ['production', 'elastic', 'critical'],
      schedule: { number: '5', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'Wikipedia API',
      urls: 'https://en.wikipedia.org/w/api.php?action=query&meta=siteinfo&format=json',
      tags: ['api', 'production'],
      schedule: { number: '5', unit: 'm' },
      'check.request.method': 'GET',
      'check.response.status': ['200'],
      locations: fourLocations,
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'JSONPlaceholder API',
      urls: 'https://jsonplaceholder.typicode.com/posts/1',
      tags: ['api', 'staging', 'test-data'],
      schedule: { number: '3', unit: 'm' },
      'check.request.method': 'GET',
      'check.response.status': ['200'],
      'check.response.body.positive': ['"userId"'],
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'httpbin POST Check',
      urls: 'https://httpbin.org/post',
      tags: ['api', 'staging'],
      schedule: { number: '10', unit: 'm' },
      'check.request.method': 'POST',
      'check.request.body': { type: 'json', value: '{"test": true}' },
      'check.request.headers': { 'Content-Type': 'application/json' },
      'check.response.status': ['200'],
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Down – Bad URL',
      urls: 'https://this-url-does-not-exist-12345.example.com',
      tags: ['down-test', 'staging'],
      schedule: { number: '10', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Down – Body Mismatch',
      urls: 'https://www.google.com',
      tags: ['down-test', 'production'],
      schedule: { number: '5', unit: 'm' },
      'check.response.body.positive': ['this-string-will-never-be-found-xyz'],
      locations: threeLocations,
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'Cloudflare DNS Check',
      urls: 'https://1.1.1.1',
      tags: ['infrastructure', 'dns', 'critical'],
      schedule: { number: '1', unit: 'm' },
      locations: allLocations,
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Disabled Monitor',
      urls: 'https://example.com',
      tags: ['disabled', 'staging'],
      schedule: { number: '30', unit: 'm' },
      enabled: false,
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Long Interval',
      urls: 'https://www.elastic.co/blog',
      tags: ['production', 'elastic', 'blog'],
      schedule: { number: '60', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP With Auth',
      urls: 'https://httpbin.org/basic-auth/user/pass',
      tags: ['api', 'auth', 'staging'],
      schedule: { number: '15', unit: 'm' },
      username: 'user',
      password: 'pass',
      locations: [privateLocUS],
    })
  );

  // ---------------------------------------------------------------------------
  // TCP monitors — various hosts, ports, tags
  // ---------------------------------------------------------------------------

  console.log('\n=== Creating TCP monitors ===');

  await createMonitor(
    tcpMonitor({
      name: 'Elasticsearch TCP',
      hosts: 'localhost:9200',
      tags: ['infrastructure', 'elastic', 'critical'],
      schedule: { number: '1', unit: 'm' },
      locations: allLocations,
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'Google DNS TCP',
      hosts: '8.8.8.8:53',
      tags: ['infrastructure', 'dns', 'production'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'Cloudflare DNS TCP',
      hosts: '1.1.1.1:53',
      tags: ['infrastructure', 'dns', 'production'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'SMTP Check',
      hosts: 'smtp.gmail.com:465',
      tags: ['email', 'production', 'critical'],
      schedule: { number: '10', unit: 'm' },
      locations: threeLocations,
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'TCP Down – Bad Port',
      hosts: 'localhost:59999',
      tags: ['down-test', 'infrastructure'],
      schedule: { number: '5', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'Redis TCP',
      hosts: 'localhost:6379',
      tags: ['infrastructure', 'cache', 'staging'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'TCP Disabled Monitor',
      hosts: 'localhost:5432',
      tags: ['disabled', 'infrastructure', 'database'],
      schedule: { number: '15', unit: 'm' },
      enabled: false,
      locations: [privateLocUS],
    })
  );

  // ---------------------------------------------------------------------------
  // ICMP monitors — various hosts, tags
  // ---------------------------------------------------------------------------

  console.log('\n=== Creating ICMP monitors ===');

  await createMonitor(
    icmpMonitor({
      name: 'Ping localhost',
      hosts: 'localhost',
      tags: ['infrastructure', 'local', 'critical'],
      schedule: { number: '1', unit: 'm' },
      locations: allLocations,
    })
  );

  await createMonitor(
    icmpMonitor({
      name: 'Ping Google DNS',
      hosts: '8.8.8.8',
      tags: ['infrastructure', 'dns', 'production'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    icmpMonitor({
      name: 'Ping Cloudflare',
      hosts: '1.1.1.1',
      tags: ['infrastructure', 'dns', 'production'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    icmpMonitor({
      name: 'ICMP Down – Bad Host',
      hosts: '192.0.2.1',
      tags: ['down-test', 'infrastructure'],
      schedule: { number: '5', unit: 'm' },
      locations: fourLocations,
    })
  );

  await createMonitor(
    icmpMonitor({
      name: 'Ping Gateway',
      hosts: '10.0.0.1',
      tags: ['infrastructure', 'network', 'staging'],
      schedule: { number: '5', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    icmpMonitor({
      name: 'ICMP Disabled Monitor',
      hosts: 'localhost',
      tags: ['disabled', 'infrastructure'],
      schedule: { number: '30', unit: 'm' },
      enabled: false,
      locations: [privateLocEU],
    })
  );

  // ---------------------------------------------------------------------------
  // Browser monitors — various scripts, tags
  // ---------------------------------------------------------------------------

  console.log('\n=== Creating Browser monitors ===');

  await createMonitor(
    browserMonitor({
      name: 'Google Search Flow',
      urls: 'https://www.google.com',
      tags: ['search', 'production', 'critical'],
      schedule: { number: '10', unit: 'm' },
      'source.inline.script': `step('Load Google', async () => {
  await page.goto('https://www.google.com');
  await page.waitForSelector('input[name="q"]');
});`,
      locations: allLocations,
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Elastic Homepage Check',
      urls: 'https://www.elastic.co',
      tags: ['production', 'elastic', 'critical'],
      schedule: { number: '15', unit: 'm' },
      'source.inline.script': `step('Load Elastic.co', async () => {
  await page.goto('https://www.elastic.co');
  await page.waitForSelector('body');
});`,
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Wikipedia Title Check',
      urls: 'https://en.wikipedia.org',
      tags: ['production', 'encyclopedia'],
      schedule: { number: '15', unit: 'm' },
      'source.inline.script': `step('Check Wikipedia title', async () => {
  await page.goto('https://en.wikipedia.org');
  await page.waitForSelector('#www-wikipedia-org');
});`,
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Browser Multi-step Login',
      urls: 'https://the-internet.herokuapp.com',
      tags: ['staging', 'auth', 'multi-step'],
      schedule: { number: '15', unit: 'm' },
      form_monitor_type: 'multistep',
      'source.inline.script': `step('Navigate to login', async () => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.waitForSelector('#login');
});
step('Fill credentials', async () => {
  await page.fill('#username', 'tomsmith');
  await page.fill('#password', 'SuperSecretPassword!');
  await page.click('button[type="submit"]');
});`,
      locations: fourLocations,
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Browser Down – Bad Assertion',
      urls: 'https://www.google.com',
      tags: ['down-test', 'staging'],
      schedule: { number: '10', unit: 'm' },
      'source.inline.script': `step('Load and fail', async () => {
  await page.goto('https://www.google.com');
  await page.waitForSelector('#nonexistent-element-xyz', { timeout: 5000 });
});`,
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Browser Disabled Monitor',
      urls: 'https://example.com',
      tags: ['disabled', 'staging'],
      schedule: { number: '30', unit: 'm' },
      enabled: false,
      'source.inline.script': `step('Disabled step', async () => {
  await page.goto('https://example.com');
});`,
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Browser Throttled Check',
      urls: 'https://www.github.com',
      tags: ['devtools', 'production', 'performance'],
      schedule: { number: '30', unit: 'm' },
      throttling: {
        id: 'custom',
        label: 'Slow 3G',
        value: { download: '0.4', upload: '0.2', latency: '400' },
      },
      'source.inline.script': `step('Load GitHub under throttle', async () => {
  await page.goto('https://www.github.com');
  await page.waitForSelector('body');
});`,
      locations: threeLocations,
    })
  );

  // ---------------------------------------------------------------------------
  // Error-scenario monitors — for the Errors Overview page
  // Covers: multiple monitor types, varied tags/domains/status codes,
  // persistent/intermittent/new error patterns, multiple locations
  // ---------------------------------------------------------------------------
  console.log('\n=== Creating error-scenario monitors ===');

  await createMonitor(
    httpMonitor({
      name: 'HTTP Down – API Gateway 503',
      urls: 'https://api-gateway.example.com',
      tags: ['api', 'production', 'critical'],
      schedule: { number: '3', unit: 'm' },
      locations: allLocations,
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Down – SSL Expired',
      urls: 'https://checkout.example.com',
      tags: ['production', 'security'],
      schedule: { number: '5', unit: 'm' },
      locations: [privateLocUS, privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Down – DNS Failure',
      urls: 'https://nonexistent-api.example.net',
      tags: ['infrastructure', 'dns'],
      schedule: { number: '5', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Down – Auth 401',
      urls: 'https://secure-api.example.com/api/v1/auth',
      tags: ['api', 'auth', 'staging'],
      schedule: { number: '5', unit: 'm' },
      locations: threeLocations,
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Down – Rate Limited 429',
      urls: 'https://rate-api.example.com',
      tags: ['api', 'production'],
      schedule: { number: '5', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Down – Payment Service',
      urls: 'https://payment.example.com',
      tags: ['payment', 'production', 'critical'],
      schedule: { number: '3', unit: 'm' },
      project_id: 'ecommerce-app',
      locations: fourLocations,
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'TCP Down – Database',
      hosts: 'db-primary.internal:5432',
      tags: ['infrastructure', 'database', 'critical'],
      schedule: { number: '1', unit: 'm' },
      locations: [privateLocUS, privateLocEU],
    })
  );

  await createMonitor(
    icmpMonitor({
      name: 'ICMP Down – CDN Node',
      hosts: '203.0.113.50',
      tags: ['infrastructure', 'cdn'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocUS, privateLocAP],
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Browser Down – Login Timeout',
      urls: 'https://app.example.com/login',
      tags: ['production', 'auth', 'critical'],
      schedule: { number: '10', unit: 'm' },
      'source.inline.script': `step('Load login page', async () => {
  await page.goto('https://app.example.com/login');
  await page.waitForSelector('#login-form', { timeout: 30000 });
});`,
      locations: threeLocations,
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Browser Down – Checkout Error',
      urls: 'https://shop.example.com/checkout',
      tags: ['ecommerce', 'production'],
      schedule: { number: '15', unit: 'm' },
      project_id: 'ecommerce-app',
      'source.inline.script': `step('Complete checkout', async () => {
  await page.goto('https://shop.example.com/checkout');
  await page.click('#submit-order');
});`,
      locations: [privateLocUS],
    })
  );

  // ---------------------------------------------------------------------------
  // Monitors with project_id — to test "group by project" grouping
  // ---------------------------------------------------------------------------

  console.log('\n=== Creating monitors with project IDs ===');

  await createMonitor(
    browserMonitor({
      name: 'E-Commerce Homepage',
      urls: 'https://www.example.com',
      tags: ['ecommerce', 'production', 'critical'],
      schedule: { number: '10', unit: 'm' },
      project_id: 'ecommerce-app',
      journey_id: 'ecommerce-homepage',
      'source.inline.script': `step('Load homepage', async () => {
  await page.goto('https://www.example.com');
  await page.waitForSelector('body');
});`,
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'E-Commerce Checkout',
      urls: 'https://www.example.com/checkout',
      tags: ['ecommerce', 'production', 'checkout'],
      schedule: { number: '15', unit: 'm' },
      project_id: 'ecommerce-app',
      journey_id: 'ecommerce-checkout',
      'source.inline.script': `step('Load checkout', async () => {
  await page.goto('https://www.example.com/checkout');
  await page.waitForSelector('body');
});`,
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'E-Commerce API Health',
      urls: 'https://httpbin.org/status/200',
      tags: ['ecommerce', 'api', 'production'],
      schedule: { number: '3', unit: 'm' },
      project_id: 'ecommerce-app',
      locations: allLocations,
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Infra Dashboard Check',
      urls: 'https://www.elastic.co/kibana',
      tags: ['infrastructure', 'dashboards', 'production'],
      schedule: { number: '10', unit: 'm' },
      project_id: 'infra-monitoring',
      journey_id: 'infra-dashboard',
      'source.inline.script': `step('Load dashboard', async () => {
  await page.goto('https://www.elastic.co/kibana');
  await page.waitForSelector('body');
});`,
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'Infra Alerts Endpoint',
      urls: 'https://httpbin.org/status/200',
      tags: ['infrastructure', 'alerts', 'production'],
      schedule: { number: '5', unit: 'm' },
      project_id: 'infra-monitoring',
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'Mobile API Health',
      urls: 'https://jsonplaceholder.typicode.com/users',
      tags: ['mobile', 'api', 'production'],
      schedule: { number: '5', unit: 'm' },
      project_id: 'mobile-app-backend',
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'Mobile Push Service',
      urls: 'https://httpbin.org/post',
      tags: ['mobile', 'notifications', 'production'],
      schedule: { number: '10', unit: 'm' },
      project_id: 'mobile-app-backend',
      'check.request.method': 'POST',
      'check.request.body': { type: 'json', value: '{"token": "test"}' },
      locations: threeLocations,
    })
  );

  // ---------------------------------------------------------------------------
  // Additional HTTP monitors with no tags (for testing empty tag grouping)
  // ---------------------------------------------------------------------------

  console.log('\n=== Creating monitors with edge-case configs ===');

  await createMonitor(
    httpMonitor({
      name: 'HTTP No Tags',
      urls: 'https://example.org',
      tags: [],
      schedule: { number: '10', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'TCP No Tags',
      hosts: 'localhost:80',
      tags: [],
      schedule: { number: '10', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Many Tags',
      urls: 'https://httpbin.org/get',
      tags: [
        'production',
        'critical',
        'api',
        'monitoring',
        'sla-99.9',
        'team-platform',
        'region-us',
        'tier-1',
      ],
      schedule: { number: '3', unit: 'm' },
      locations: allLocations,
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP 2min Schedule',
      urls: 'https://httpbin.org/status/200',
      tags: ['api', 'schedule-test'],
      schedule: { number: '2', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP 4h Schedule',
      urls: 'https://httpbin.org/status/200',
      tags: ['api', 'schedule-test'],
      schedule: { number: '240', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  // ---------------------------------------------------------------------------
  // Ingest mock summary data into ES for all monitors
  // ---------------------------------------------------------------------------

  console.log('\n=== Ingesting mock summary data ===');

  const allMonitors = await fetchAllMonitors();

  console.log(`  Found ${allMonitors.length} monitors to seed data for`);

  const { upCount, downCount } = await ingestSummaryData(allMonitors);
  console.log(`  ✓ Ingested ${upCount} up + ${downCount} down summary docs`);

  // ---------------------------------------------------------------------------
  // Ingest rich error data for the Errors Overview page
  // ---------------------------------------------------------------------------
  console.log('\n=== Ingesting error data (48h window) ===');

  const { errorDocCount } = await ingestErrorData(allMonitors);
  console.log(`  ✓ Ingested ${errorDocCount} error docs across current + previous periods`);

  if (cliArgs.live) {
    await runLiveMode(allMonitors);
  }

  console.log('\n=== Done! ===');

  console.log('Summary of created monitors:');

  console.log('  HTTP:      22 monitors (12 standard + 6 error-scenario + 4 edge-case)');

  console.log('  TCP:       9 monitors (7 standard + 1 error-scenario + 1 disabled)');

  console.log('  ICMP:      7 monitors (5 standard + 1 error-scenario + 1 disabled)');

  console.log('  Browser:   12 monitors (7 standard + 2 error-scenario + 3 project)');

  console.log(
    '  w/ Project: 9 monitors (3 projects: ecommerce-app, infra-monitoring, mobile-app-backend)'
  );

  console.log('  Total:     ~50 monitors across 5 private locations');

  console.log('\nGroup-by coverage:');

  console.log('  By Type:     http, tcp, icmp, browser');

  console.log('  By Location: US East, EU West, Asia Pacific, South America, Australia');

  console.log('  By Tags:     production, staging, critical, api, infrastructure, dns, ...');

  console.log('  By Project:  ecommerce-app, infra-monitoring, mobile-app-backend');

  console.log('  By Monitor:  each monitor is uniquely named');

  console.log('\nErrors page coverage:');

  console.log('  15 "down" monitors generating error data');

  console.log(
    '  Error groups: DNS, timeout, HTTP 5xx, SSL, connection refused, body mismatch, ...'
  );

  console.log(
    '  Patterns:    persistent (DNS, 503, conn refused), intermittent (429), new (SSL, 401, JS error)'
  );

  console.log(
    '  Insights:    domains (8+), tags (15+), status codes (200/401/429/502/503), all 4 monitor types'
  );

  console.log('  Trend:       current + previous period data for delta indicators');
};
