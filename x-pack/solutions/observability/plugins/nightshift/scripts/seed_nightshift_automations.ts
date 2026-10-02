/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seeds Nightshift automations for local development. Run from the repo root:
 *
 *   node -r @kbn/setup-node-env x-pack/solutions/observability/plugins/nightshift/scripts/seed_nightshift_automations.ts
 *
 * Add --help to list the connection flags.
 */

import { run } from '@kbn/dev-cli-runner';

const EXECUTIONS_INDEX = '.workflows-executions';
const RUN_ID_PREFIX = 'seed-nightshift-';
const SEED_USER_PASSWORD = 'changeme';
const HOUR_MS = 3_600_000;

type RunStatus = 'completed' | 'failed' | 'running';

interface SeedAutomation {
  name: string;
  kind: 'alert' | 'schedule';
  tags: string[];
  author: string;
  enabled: boolean;
  limit: number;
  runs48h: number;
  runsToday: number;
  failed: number;
  running: number;
}

const AUTOMATIONS: SeedAutomation[] = [
  {
    name: 'Triage incoming alerts',
    kind: 'alert',
    tags: ['triage', 'alerts'],
    author: 'Emily Clarke',
    enabled: true,
    limit: 20,
    runs48h: 28,
    runsToday: 27,
    failed: 4,
    running: 1,
  },
  {
    name: 'Escalate on-call alerts',
    kind: 'alert',
    tags: ['oncall', 'escalation', 'p1'],
    author: 'James Turner',
    enabled: true,
    limit: 10,
    runs48h: 21,
    runsToday: 10,
    failed: 5,
    running: 0,
  },
  {
    name: 'Triage P0 Issues',
    kind: 'alert',
    tags: ['p0', 'triage'],
    author: 'Sarah Mitchell',
    enabled: true,
    limit: 25,
    runs48h: 4,
    runsToday: 3,
    failed: 2,
    running: 0,
  },
  {
    name: 'Managed Slack bot mention',
    kind: 'alert',
    tags: [],
    author: 'Nightshift',
    enabled: true,
    limit: 100,
    runs48h: 2,
    runsToday: 2,
    failed: 0,
    running: 0,
  },
  {
    name: 'Daily Report - Active Usage',
    kind: 'schedule',
    tags: ['reporting', 'leadership'],
    author: 'Emily Clarke',
    enabled: true,
    limit: 5,
    runs48h: 2,
    runsToday: 1,
    failed: 0,
    running: 1,
  },
  {
    name: 'Product usage by channel and customers',
    kind: 'schedule',
    tags: ['reporting', 'product'],
    author: 'Daniel Hughes',
    enabled: false,
    limit: 20,
    runs48h: 0,
    runsToday: 0,
    failed: 0,
    running: 0,
  },
  {
    name: 'Investigate incoming alerts',
    kind: 'alert',
    tags: [],
    author: 'Daniel Hughes',
    enabled: false,
    limit: 20,
    runs48h: 0,
    runsToday: 0,
    failed: 0,
    running: 0,
  },
];

const basicAuth = (credentials: string): string =>
  `Basic ${Buffer.from(credentials).toString('base64')}`;

const request = async <T>(
  url: string,
  {
    method = 'GET',
    auth,
    body,
    ndjson = false,
  }: {
    method?: string;
    auth: string;
    body?: unknown;
    ndjson?: boolean;
  }
): Promise<T> => {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: basicAuth(auth),
      'Content-Type': ndjson ? 'application/x-ndjson' : 'application/json',
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'Kibana',
    },
    body: typeof body === 'string' || body === undefined ? body : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${url} -> ${response.status}: ${text.slice(0, 500)}`);
  }
  return (text ? JSON.parse(text) : undefined) as T;
};

const resolveKibanaUrl = async (url: string, auth: string): Promise<string> => {
  const base = url.replace(/\/$/, '');
  if (new URL(base).pathname !== '/') {
    return base;
  }
  const response = await fetch(`${base}/`, {
    redirect: 'manual',
    headers: { Authorization: basicAuth(auth) },
  });
  const location = response.headers.get('location');
  return location && /^\/[^/?]+\/?$/.test(location)
    ? `${base}${location.replace(/\/$/, '')}`
    : base;
};

const triggerRows = ({ kind }: SeedAutomation) =>
  kind === 'schedule' ? [{ kind: 'schedule', schedulePreset: 'daily' }] : [{ kind: 'alert' }];

const randomTimes = (start: number, end: number, count: number): number[] =>
  Array.from({ length: count }, () => start + Math.random() * (end - start)).sort((a, b) => a - b);

const getRunStatuses = ({ runs48h, failed, running }: SeedAutomation): RunStatus[] => {
  const statuses: RunStatus[] = Array.from({ length: runs48h }, (_, index) =>
    index < failed ? 'failed' : 'completed'
  ).sort(() => Math.random() - 0.5);
  return [...statuses.slice(0, runs48h - running), ...Array(running).fill('running')];
};

const runDoc = (
  runId: string,
  workflowId: string,
  name: string,
  startedAt: number,
  status: RunStatus
) => {
  const duration = 20_000 + Math.floor(Math.random() * 580_000);
  return {
    id: runId,
    spaceId: 'default',
    workflowId,
    isTestRun: false,
    status,
    createdAt: new Date(startedAt).toISOString(),
    startedAt: new Date(startedAt).toISOString(),
    ...(status === 'running'
      ? {}
      : { finishedAt: new Date(startedAt + duration).toISOString(), duration }),
    triggeredBy: 'alert',
    workflowDefinition: { name, tags: ['nightshift', 'automation'] },
  };
};

run(
  async ({ log, flags }) => {
    const esUrl = String(flags['es-url']);
    const auth = String(flags.auth);
    const kibanaUrl = await resolveKibanaUrl(String(flags['kibana-url']), auth);
    const now = Date.now();
    const midnight = new Date(now).setUTCHours(0, 0, 0, 0);
    const names = new Set(AUTOMATIONS.map(({ name }) => name));

    const { automations } = await request<{ automations: Array<{ id: string; name: string }> }>(
      `${kibanaUrl}/internal/nightshift/automations`,
      { auth }
    );
    for (const { id, name } of automations.filter((automation) => names.has(automation.name))) {
      await request(`${kibanaUrl}/internal/nightshift/automations/${id}`, {
        method: 'DELETE',
        auth,
      });
      log.info(`Deleted existing "${name}"`);
    }
    await request(`${esUrl}/${EXECUTIONS_INDEX}/_delete_by_query?refresh=true`, {
      method: 'POST',
      auth,
      body: { query: { prefix: { id: RUN_ID_PREFIX } } },
    });

    for (const automation of AUTOMATIONS) {
      const { name, author, enabled, limit, runs48h, runsToday } = automation;
      await request(`${esUrl}/_security/user/${encodeURIComponent(author)}`, {
        method: 'PUT',
        auth,
        body: { password: SEED_USER_PASSWORD, roles: ['superuser'], full_name: author },
      });
      const created = await request<{ workflowId: string }>(
        `${kibanaUrl}/internal/nightshift/automations`,
        {
          method: 'POST',
          auth: `${author}:${SEED_USER_PASSWORD}`,
          body: {
            name,
            tags: automation.tags,
            isEnabled: enabled,
            trigger: { rows: triggerRows(automation) },
            execution: {},
            completion: {},
            runtime: { dailyDispatchLimit: limit },
          },
        }
      );

      const times = [
        ...randomTimes(now - 48 * HOUR_MS, midnight, runs48h - runsToday),
        ...randomTimes(midnight, now, runsToday),
      ];
      const statuses = getRunStatuses(automation);
      const lines = times.flatMap((startedAt, index) => {
        const runId = `${RUN_ID_PREFIX}${created.workflowId}-${index}`;
        return [
          { index: { _index: EXECUTIONS_INDEX, _id: runId } },
          runDoc(runId, created.workflowId, name, startedAt, statuses[index]),
        ];
      });
      if (lines.length) {
        const result = await request<{ errors: boolean }>(`${esUrl}/_bulk?refresh=true`, {
          method: 'POST',
          auth,
          ndjson: true,
          body: `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`,
        });
        if (result.errors) {
          throw new Error(`Bulk indexing runs failed for "${name}"`);
        }
      }
      log.success(
        `${name}: ${runs48h} runs in 48h, ${runsToday}/${limit} today, by ${author}, ${
          enabled ? 'active' : 'paused'
        }`
      );
    }
    log.info(`Open ${kibanaUrl}/app/nightshift/automations`);
  },
  {
    description: `Seeds ${AUTOMATIONS.length} Nightshift automations with varied authors, tags, run history, and daily usage.

      Each author is created as a superuser so the automation records them as its creator. Runs are
      written straight into ${EXECUTIONS_INDEX}, including failed and still-running runs.
      Re-running deletes the seeded automations and runs first.`,
    flags: {
      string: ['es-url', 'kibana-url', 'auth'],
      default: {
        'es-url': 'http://localhost:9200',
        'kibana-url': 'http://localhost:5601',
        auth: 'elastic:changeme',
      },
      help: `
        --es-url      Elasticsearch URL (default: http://localhost:9200)
        --kibana-url  Kibana URL; the dev base path is auto-detected (default: http://localhost:5601)
        --auth        Superuser credentials (default: elastic:changeme)
      `,
    },
  }
);
