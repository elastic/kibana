/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Synthetics × Agent Builder smoke verification script.
 *
 * This is the **scriptable companion** to the manual smoke-test doc at
 * `~/.agents/synthetics-agent-builder/notes/01-monitor-management/smoke-tests.md`.
 * It bypasses the LLM and the chat UI entirely and verifies the two
 * pieces that matter for shipping confidence:
 *
 * 1. **Bind / discovery** — the `monitor-management` skill is registered
 *    with Agent Builder and discoverable via the public skills API.
 *    Failures here usually mean the bind on setup never ran (FF was
 *    silently off, plugin missing, allow_lists.ts didn't pick up the
 *    skill id).
 *
 * 2. **Canvas-Save persistence round-trip** — a complete
 *    `MonitorAttachmentData` payload, identical in shape to what the
 *    canvas Save button POSTs, lands a real synthetics monitor and is
 *    cleanly readable back, then deletable. This proves the
 *    monitor-form codec parity (T1 vs `SyntheticsMonitorCodec`) and
 *    the role-derived auth behaviour without manual chrome.
 *
 * What this script does **NOT** verify (intentionally):
 *
 * - The actual UI rendering. Manual smoke covers that. A future Scout
 *   UI test would as well — see `notes/01-monitor-management/scout-outline.md`.
 * - The tool execution path under conversation context. The tool's
 *   `attachments.add` / `getAttachmentRecord` calls require a live
 *   conversation; calling the public `/_execute` endpoint without one
 *   would fail in a misleading way. The tool is exhaustively covered
 *   by Jest unit tests (`manage_synthetics_monitor.test.ts`).
 * - Attachment `resolve` / `isStale`. Same conversation-context limit;
 *   covered by Jest in `monitor_management_attachment_type.test.ts`.
 *
 * Usage:
 *
 *     node x-pack/solutions/observability/plugins/synthetics/scripts/agent_builder_monitor_smoke.js
 *
 * Auto-detects Kibana credentials from `kibana.yml` / `kibana.dev.yml`
 * (same logic as `generate_monitors.ts`), falling back to
 * `elastic:changeme` on `http://127.0.0.1:5601`.
 *
 * Configuration (env vars, all optional):
 *
 *     KIBANA_URL          base URL (default http://127.0.0.1:5601)
 *     KIBANA_USERNAME     (default from kibana.yml or 'elastic')
 *     KIBANA_PASSWORD     (default from kibana.yml or 'changeme')
 *     SMOKE_LOCATION_ID   private-location id to use; falls back to
 *                         the first available location (Elastic-managed
 *                         preferred over private)
 *     SMOKE_MONITOR_NAME  monitor name (default 'Agent Builder smoke
 *                         test'); the script always cleans it up at the
 *                         end of a successful run.
 *     SMOKE_VERBOSE       'true' to log each request/response
 *
 * Exit codes:
 *
 *     0  all stages passed
 *     1  at least one stage failed (details printed)
 *     2  setup error (no location found, auth failed before stage 1, …)
 */

import axios, { type AxiosInstance } from 'axios';
import { readKibanaConfig } from '@kbn/observability-synthetics-test-data';

// ---------------------------------------------------------------------------
// Pretty-printing helpers
// ---------------------------------------------------------------------------

const COLOR = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const tag = {
  pass: `${COLOR.green}PASS${COLOR.reset}`,
  fail: `${COLOR.red}FAIL${COLOR.reset}`,
  skip: `${COLOR.yellow}SKIP${COLOR.reset}`,
  info: `${COLOR.cyan}INFO${COLOR.reset}`,
  step: `${COLOR.bold}>>${COLOR.reset}`,
};

const verbose = process.env.SMOKE_VERBOSE === 'true';

const log = (line: string) => {
  // eslint-disable-next-line no-console
  console.log(line);
};

const logVerbose = (line: string) => {
  if (verbose) {
    log(`${COLOR.gray}${line}${COLOR.reset}`);
  }
};

// ---------------------------------------------------------------------------
// Config + auth resolution
// ---------------------------------------------------------------------------

interface ResolvedConfig {
  baseUrl: string;
  username: string;
  password: string;
  locationIdHint: string | undefined;
  monitorName: string;
}

const resolveConfig = (): ResolvedConfig => {
  const baseUrl = process.env.KIBANA_URL ?? 'http://127.0.0.1:5601';
  let username = process.env.KIBANA_USERNAME;
  let password = process.env.KIBANA_PASSWORD;

  if (!username || !password) {
    try {
      const config = readKibanaConfig();
      const yamlUser = config.elasticsearch?.username;
      // `kibana_system_user` can't write monitors; the dev usually wants
      // the superuser path here. Same pivot `generate_monitors.ts` does.
      username = username ?? (yamlUser === 'kibana_system_user' ? 'elastic' : yamlUser);
      password = password ?? config.elasticsearch?.password;
    } catch {
      // fall through
    }
  }

  return {
    baseUrl,
    username: username ?? 'elastic',
    password: password ?? 'changeme',
    locationIdHint: process.env.SMOKE_LOCATION_ID,
    monitorName: process.env.SMOKE_MONITOR_NAME ?? 'Agent Builder smoke test',
  };
};

const buildHttp = (config: ResolvedConfig): AxiosInstance =>
  axios.create({
    baseURL: config.baseUrl,
    auth: { username: config.username, password: config.password },
    headers: {
      'kbn-xsrf': 'true',
      'elastic-api-version': '2023-10-31',
    },
    // We assert non-2xx ourselves so we can render a clean failure line
    // instead of a mid-stack axios throw.
    validateStatus: () => true,
  });

// ---------------------------------------------------------------------------
// Stage results
// ---------------------------------------------------------------------------

interface StageResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  detail?: string;
}

const printStage = (result: StageResult) => {
  const symbol =
    result.status === 'pass' ? tag.pass : result.status === 'fail' ? tag.fail : tag.skip;
  log(
    `  ${symbol}  ${result.name}${
      result.detail ? `  ${COLOR.dim}—${COLOR.reset} ${result.detail}` : ''
    }`
  );
};

// ---------------------------------------------------------------------------
// Stage 1 — Bind / discovery
// ---------------------------------------------------------------------------

interface SkillSummary {
  id: string;
  name?: string;
}

const stageDiscoverSkill = async (http: AxiosInstance): Promise<StageResult[]> => {
  const results: StageResult[] = [];

  log(`\n${tag.step} Stage 1 — Skill registration & discovery\n`);

  const listResp = await http.get('/api/agent_builder/skills', {
    params: { include_plugins: true },
  });
  logVerbose(`GET /api/agent_builder/skills?include_plugins=true → ${listResp.status}`);

  if (listResp.status !== 200) {
    results.push({
      name: 'List skills returns 200',
      status: 'fail',
      detail: `got ${listResp.status} (${
        typeof listResp.data === 'object' ? JSON.stringify(listResp.data).slice(0, 200) : 'no body'
      })`,
    });
    return results;
  }
  results.push({ name: 'List skills returns 200', status: 'pass' });

  const skills: SkillSummary[] = Array.isArray(listResp.data?.results) ? listResp.data.results : [];
  const found = skills.find((s) => s.id === 'monitor-management');
  results.push({
    name: 'monitor-management skill is listed',
    status: found ? 'pass' : 'fail',
    detail: found ? undefined : `not in ${skills.length} returned skills`,
  });
  if (!found) {
    return results;
  }

  const skillResp = await http.get('/api/agent_builder/skills/monitor-management');
  logVerbose(`GET /api/agent_builder/skills/monitor-management → ${skillResp.status}`);
  if (skillResp.status !== 200) {
    results.push({
      name: 'Get monitor-management skill returns 200',
      status: 'fail',
      detail: `got ${skillResp.status}`,
    });
    return results;
  }
  results.push({ name: 'Get monitor-management skill returns 200', status: 'pass' });

  const skill = skillResp.data;
  const content: string = typeof skill?.content === 'string' ? skill.content : '';

  results.push({
    name: 'Skill content references manage_synthetics_monitor tool',
    status: content.includes('manage_synthetics_monitor') ? 'pass' : 'fail',
    detail: content.length === 0 ? 'empty content' : undefined,
  });

  results.push({
    name: 'Skill content explains the operations[] surface',
    status:
      content.includes('set_metadata') &&
      content.includes('set_schedule') &&
      content.includes('set_locations') &&
      content.includes('set_http_check')
        ? 'pass'
        : 'fail',
  });

  return results;
};

// ---------------------------------------------------------------------------
// Stage 2 — Persistence round-trip
// ---------------------------------------------------------------------------

interface ResolvedLocation {
  id: string;
  label?: string;
  isServiceManaged: boolean;
}

const resolveLocation = async (
  http: AxiosInstance,
  hint: string | undefined
): Promise<ResolvedLocation | undefined> => {
  // Prefer the public service-locations endpoint (returns Elastic-managed
  // locations + private locations). When a hint id is provided, find by id
  // exactly; otherwise prefer the first Elastic-managed entry, then the
  // first private one.
  const resp = await http.get('/internal/uptime/service/locations');
  logVerbose(`GET /internal/uptime/service/locations → ${resp.status}`);
  if (resp.status !== 200) {
    return undefined;
  }
  const locations: ResolvedLocation[] = Array.isArray(resp.data?.locations)
    ? resp.data.locations
    : [];
  if (locations.length === 0) {
    return undefined;
  }
  if (hint) {
    return locations.find((l) => l.id === hint);
  }
  return locations.find((l) => l.isServiceManaged) ?? locations[0];
};

const buildMonitorPayload = (location: ResolvedLocation, monitorName: string) => ({
  // Field-name parity with `MonitorAttachmentData` (T1) and the canvas
  // Save body (T7). The server's `normalizeAPIConfig` fills in
  // `DEFAULT_FIELDS[http]` for everything we don't pass.
  type: 'http',
  enabled: true,
  alert: { status: { enabled: true }, tls: { enabled: true } },
  schedule: { number: '5', unit: 'm' },
  locations: [
    {
      id: location.id,
      label: location.label ?? location.id,
      isServiceManaged: location.isServiceManaged,
    },
  ],
  name: monitorName,
  urls: 'https://example.com',
  tags: ['agent-builder-smoke'],
  namespace: 'default',
  origin: 'ui',
});

const stagePersistenceRoundTrip = async (
  http: AxiosInstance,
  monitorName: string,
  locationHint: string | undefined
): Promise<{ results: StageResult[]; createdConfigId?: string }> => {
  const results: StageResult[] = [];

  log(`\n${tag.step} Stage 2 — Canvas-Save persistence round-trip\n`);

  const location = await resolveLocation(http, locationHint);
  if (!location) {
    results.push({
      name: 'Resolved a synthetics location',
      status: 'skip',
      detail: locationHint
        ? `no location with id "${locationHint}"`
        : 'no Elastic-managed or private locations configured',
    });
    return { results };
  }
  results.push({
    name: 'Resolved a synthetics location',
    status: 'pass',
    detail: `${location.id} (${location.isServiceManaged ? 'managed' : 'private'})`,
  });

  // POST — what the canvas's Create button does
  const monitorBody = buildMonitorPayload(location, monitorName);
  const createResp = await http.post('/api/synthetics/monitors', monitorBody, {
    params: { internal: true },
  });
  logVerbose(`POST /api/synthetics/monitors → ${createResp.status}`);

  if (createResp.status !== 200) {
    results.push({
      name: 'POST /api/synthetics/monitors creates the monitor',
      status: 'fail',
      detail: `got ${createResp.status} (${
        typeof createResp.data === 'object'
          ? JSON.stringify(createResp.data).slice(0, 200)
          : 'no body'
      })`,
    });
    return { results };
  }

  const created = createResp.data;
  // Successful body has a top-level `id`. Partial-failure bodies put it
  // at `attributes.id` — that's still a save success for our purposes.
  const configId: string | undefined =
    typeof created?.id === 'string' ? created.id : created?.attributes?.id;

  if (!configId) {
    results.push({
      name: 'Create response includes a config id',
      status: 'fail',
      detail: 'neither response.id nor response.attributes.id was present',
    });
    return { results };
  }
  results.push({
    name: 'POST /api/synthetics/monitors creates the monitor',
    status: 'pass',
    detail: `id=${configId}`,
  });

  // GET — confirm round-trip readability
  const getResp = await http.get(`/api/synthetics/monitors/${encodeURIComponent(configId)}`);
  logVerbose(`GET /api/synthetics/monitors/${configId} → ${getResp.status}`);

  if (getResp.status !== 200) {
    results.push({
      name: 'GET round-trip returns the saved monitor',
      status: 'fail',
      detail: `got ${getResp.status}`,
    });
    return { results, createdConfigId: configId };
  }

  const fetched = getResp.data;
  const matchesName = fetched?.name === monitorName;
  const matchesUrl = fetched?.urls === 'https://example.com';
  const matchesSchedule = fetched?.schedule?.number === '5' && fetched?.schedule?.unit === 'm';

  results.push({
    name: 'GET round-trip returns the saved monitor',
    status: matchesName && matchesUrl && matchesSchedule ? 'pass' : 'fail',
    detail:
      matchesName && matchesUrl && matchesSchedule
        ? `name + url + schedule match`
        : `mismatch — name: ${fetched?.name}, url: ${fetched?.urls}, schedule: ${JSON.stringify(
            fetched?.schedule
          )}`,
  });

  return { results, createdConfigId: configId };
};

const cleanupMonitor = async (http: AxiosInstance, configId: string): Promise<StageResult> => {
  const resp = await http.delete(`/api/synthetics/monitors/${encodeURIComponent(configId)}`);
  logVerbose(`DELETE /api/synthetics/monitors/${configId} → ${resp.status}`);
  return {
    name: 'Cleanup: DELETE the smoke-test monitor',
    status: resp.status === 200 ? 'pass' : 'fail',
    detail:
      resp.status === 200
        ? undefined
        : `got ${resp.status}; manually run "DELETE /api/synthetics/monitors/${configId}"`,
  };
};

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

export const runAgentBuilderMonitorSmoke = async (): Promise<void> => {
  const config = resolveConfig();
  const http = buildHttp(config);

  log(`${COLOR.bold}Synthetics × Agent Builder smoke${COLOR.reset}`);
  log(`  ${COLOR.dim}base url:${COLOR.reset} ${config.baseUrl}`);
  log(`  ${COLOR.dim}user:    ${COLOR.reset} ${config.username}`);
  log(`  ${COLOR.dim}monitor: ${COLOR.reset} "${config.monitorName}"`);

  const allResults: StageResult[] = [];
  let configIdToCleanup: string | undefined;
  let setupFailed = false;

  try {
    const stage1 = await stageDiscoverSkill(http);
    allResults.push(...stage1);
    stage1.forEach(printStage);

    if (stage1.some((r) => r.status === 'fail')) {
      log(
        `\n${tag.info} Stage 1 found bind issues — Stage 2 still runs (it tests a different surface).`
      );
    }

    const stage2 = await stagePersistenceRoundTrip(http, config.monitorName, config.locationIdHint);
    allResults.push(...stage2.results);
    stage2.results.forEach(printStage);
    configIdToCleanup = stage2.createdConfigId;
  } catch (error) {
    setupFailed = true;
    log(
      `\n${tag.fail}  Setup error before all stages completed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (configIdToCleanup) {
    log(`\n${tag.step} Cleanup\n`);
    const cleanup = await cleanupMonitor(http, configIdToCleanup);
    allResults.push(cleanup);
    printStage(cleanup);
  }

  // Summary
  const passed = allResults.filter((r) => r.status === 'pass').length;
  const failed = allResults.filter((r) => r.status === 'fail').length;
  const skipped = allResults.filter((r) => r.status === 'skip').length;

  log('');
  log(
    `${COLOR.bold}Summary:${COLOR.reset} ${COLOR.green}${passed} passed${COLOR.reset}, ${
      failed > 0 ? COLOR.red : COLOR.dim
    }${failed} failed${COLOR.reset}, ${COLOR.yellow}${skipped} skipped${COLOR.reset}`
  );

  if (setupFailed) {
    process.exitCode = 2;
    return;
  }
  process.exitCode = failed > 0 ? 1 : 0;
};
