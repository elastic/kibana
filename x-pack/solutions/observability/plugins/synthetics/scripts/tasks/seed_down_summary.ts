/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

// Dev helper: pushes a synthetic "up" or "down" summary ping into ES so the
// overview page renders the new "Down · 12m · <error>" cell + per-location dot
// strip without needing a real failing monitor.
//
// Usage:
//   node x-pack/solutions/observability/plugins/synthetics/scripts/seed_down_summary.js --list
//   node x-pack/solutions/observability/plugins/synthetics/scripts/seed_down_summary.js \
//       --configId <id> --locationId <id> --locationLabel "<label>" \
//       [--status down|up] [--monitorId <id>] [--monitorType http|tcp|icmp|browser] \
//       [--minutesAgo 12] [--errorMessage "TLS handshake failed"] [--errorType io] \
//       [--name "Checkout flow"]

import { Client } from '@elastic/elasticsearch';
import axios from 'axios';
import https from 'https';
import moment from 'moment';
import {
  makeDownSummary,
  makeUpSummary,
  readKibanaConfig,
} from '@kbn/observability-synthetics-test-data';

interface ParsedArgs {
  list: boolean;
  status: 'up' | 'down';
  configId?: string;
  locationId?: string;
  locationLabel?: string;
  monitorId?: string;
  monitorType: string;
  minutesAgo: number;
  errorMessage: string;
  errorType: string;
  name?: string;
}

const parseArgs = (): ParsedArgs => {
  const argv = process.argv.slice(2);
  const opts: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      opts[key] = true;
    } else {
      opts[key] = next;
      i += 1;
    }
  }
  const status = (opts.status as string) === 'up' ? 'up' : 'down';
  return {
    list: Boolean(opts.list),
    status,
    configId: opts.configId as string | undefined,
    locationId: opts.locationId as string | undefined,
    locationLabel: opts.locationLabel as string | undefined,
    monitorId: opts.monitorId as string | undefined,
    monitorType: (opts.monitorType as string) ?? 'http',
    minutesAgo: opts.minutesAgo ? Number(opts.minutesAgo) : 12,
    errorMessage: (opts.errorMessage as string) ?? 'TLS handshake failed',
    errorType: (opts.errorType as string) ?? 'io',
    name: opts.name as string | undefined,
  };
};

const getKibanaAuthAndUrl = () => {
  const config = readKibanaConfig();
  // YAML supports both `server: { basePath }` and the flat `server.basePath`
  // form — we honour both. Same goes for host/port. Env overrides win.
  const flat = (key: string) => config[key];
  const host = process.env.KIBANA_HOST ?? config.server?.host ?? flat('server.host') ?? '127.0.0.1';
  const resolvedHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  const port = process.env.KIBANA_PORT ?? config.server?.port ?? flat('server.port') ?? 5601;
  const basePath =
    process.env.KIBANA_BASE_PATH ?? config.server?.basePath ?? flat('server.basePath') ?? '';
  const protocol = process.env.KIBANA_PROTOCOL ?? 'http';
  const username =
    process.env.KIBANA_USERNAME ??
    (config.elasticsearch?.username === 'kibana_system_user'
      ? 'elastic'
      : config.elasticsearch?.username ?? 'elastic');
  const password = process.env.KIBANA_PASSWORD ?? config.elasticsearch?.password ?? 'changeme';
  const baseUrl = `${protocol}://${resolvedHost}:${port}${basePath}`;
  return { username, password, baseUrl };
};

const buildEsClient = () => {
  const config = readKibanaConfig();
  const node = process.env.ES_URL ?? config.elasticsearch?.hosts;
  if (!node) {
    throw new Error('elasticsearch.hosts missing from kibana.dev.yml / kibana.yml');
  }
  // The kibana.dev.yml password belongs to the kibana_system_user service
  // account, which can't write to synthetics-* indices. Fall back to the
  // `elastic` superuser (same password in single-tenant dev clusters), or
  // honour ES_USERNAME / ES_PASSWORD overrides.
  const rawUser = config.elasticsearch?.username;
  const username =
    process.env.ES_USERNAME ?? (rawUser === 'kibana_system_user' || !rawUser ? 'elastic' : rawUser);
  const password = process.env.ES_PASSWORD ?? config.elasticsearch?.password;
  const verificationMode = config.elasticsearch?.ssl?.verificationMode;
  return new Client({
    node: Array.isArray(node) ? node[0] : node,
    auth: username && password ? { username, password } : undefined,
    tls: verificationMode === 'none' ? { rejectUnauthorized: false } : undefined,
  });
};

const listMonitors = async () => {
  const { username, password, baseUrl } = getKibanaAuthAndUrl();
  const url = `${baseUrl}/api/synthetics/monitors?perPage=200`;
  const res = await axios.get(url, {
    auth: { username, password },
    headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  });
  const monitors = res.data?.monitors ?? [];
  if (!monitors.length) {
    console.log('No monitors found.');
    return;
  }
  console.log(`Found ${monitors.length} monitor(s):\n`);
  for (const m of monitors) {
    const locs = (m.locations ?? [])
      .map((l: { id: string; label: string }) => `${l.label} (${l.id})`)
      .join(', ');
    console.log(
      [
        `  name:       ${m.name}`,
        `  configId:   ${m.config_id}`,
        `  monitorId:  ${m.id}`,
        `  type:       ${m.type}`,
        `  enabled:    ${m.enabled}`,
        `  locations:  ${locs || '—'}`,
      ].join('\n')
    );
    console.log('');
  }
};

const seedDoc = async (args: ParsedArgs) => {
  if (!args.configId || !args.locationId || !args.locationLabel) {
    console.error(
      'Missing required args. Provide --configId, --locationId and --locationLabel (or run --list).'
    );
    process.exit(1);
  }
  const now = moment();
  const startedAt = now.clone().subtract(args.minutesAgo, 'minutes');
  const monitorId = args.monitorId ?? args.configId;

  const commonOverrides = {
    name: args.name,
    timestamp: now.toISOString(),
    monitorId,
    configId: args.configId,
    location: { id: args.locationId, label: args.locationLabel },
  };

  const document =
    args.status === 'down' ? makeDownSummary(commonOverrides) : makeUpSummary(commonOverrides);

  // Override the bits that matter for the Status cell render so we get a
  // stable, predictable preview rather than the helper's hard-coded values.
  if (args.status === 'down') {
    (document as any).error = { message: args.errorMessage, type: args.errorType };
    (document as any).state = {
      ...(document as any).state,
      started_at: startedAt.toISOString(),
      duration_ms: now.diff(startedAt),
      status: 'down',
      down: 1,
      up: 0,
    };
  } else {
    (document as any).state = {
      ...(document as any).state,
      started_at: startedAt.toISOString(),
      duration_ms: now.diff(startedAt),
      status: 'up',
      down: 0,
      up: 1,
    };
  }
  (document as any).monitor = {
    ...(document as any).monitor,
    type: args.monitorType,
    id: monitorId,
    // Keep the timespan window covering the current 15m so the overview
    // service's `monitor.timespan` filter accepts this doc.
    timespan: {
      lt: now.clone().add(5, 'minutes').toISOString(),
      gte: now.clone().subtract(5, 'minutes').toISOString(),
    },
  };

  const esClient = buildEsClient();
  const index = `synthetics-${args.monitorType}-default`;
  const result = await esClient.index({
    index,
    document,
    refresh: true,
  });
  console.log(`Indexed ${args.status} summary into "${index}" (id: ${result._id})`);
  console.log({
    status: args.status,
    configId: args.configId,
    monitorId,
    locationId: args.locationId,
    locationLabel: args.locationLabel,
    since: startedAt.toISOString(),
    ...(args.status === 'down' && {
      errorMessage: args.errorMessage,
      errorType: args.errorType,
    }),
  });
};

export const seedDownSummary = async () => {
  try {
    const args = parseArgs();
    if (args.list) {
      await listMonitors();
      return;
    }
    await seedDoc(args);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
