/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Seeds two real, registered Agent Builder tools (`virustotal_lookup` and
 * `on_call_lookup`) via the public tools API (POST /api/agent_builder/tools)
 * so the workflow-execution persona-matrix examples can score genuine
 * tool-selection: did the agent choose and invoke the right tool, given its
 * name and description matching a VirusTotal hash check / on-call query.
 *
 * These are deliberately NOT wired to a real VirusTotal/PagerDuty backend
 * (no connector, no MCP server, no external API). What's being scored here
 * is tool selection, not live threat-intel/on-call data -- an ES|QL tool
 * querying the already-seeded Chrysalis alert data is sufficient and keeps
 * this suite dependency-free. See PERSONA_MATRIX_VIRUSTOTAL/PAGERDUTY
 * connector history in git blame if a future suite needs to test the real
 * connector-step-workflow path instead (that requires a live/mocked
 * VirusTotal API key and, for PagerDuty, a real MCP round-trip -- much
 * heavier machinery than tool-selection scoring needs).
 */
const ELASTIC_API_VERSION = '2023-10-31';
const AGENT_BUILDER_TOOLS_HEADERS = {
  'Content-Type': 'application/json',
  'elastic-api-version': ELASTIC_API_VERSION,
} as const;

const ALERT_INDEX = '.internal.alerts-security.alerts-default-000001';

// Indices written by the parity seed (chrysalis_parity_docs.ts). The parity
// ES|QL shims must query these, not ALERT_INDEX — parity seeding never writes
// the internal alerts index.
const PARITY_ALERT_INDEX = 'logs-chrysalis-sim.alerts-default';
const PARITY_TI_INDEX = 'logs-ti_chrysalis_sim-default';
const PARITY_ON_CALL_INDEX = 'on-call-schedule';

export const PERSONA_MATRIX_TOOL_IDS = ['virustotal_lookup', 'on_call_lookup'] as const;

/**
 * Original-benchmark-era tool names referenced verbatim by the parity prompts
 * (#295228). They do not exist as current builtins, so parity runs seed them as
 * lightweight ES|QL shims over the seeded Chrysalis data. Only seeded when
 * SEED_PROFILE=parity — minimal-profile runs keep the two tools above only,
 * matching the published matrix environment.
 */
export const PERSONA_MATRIX_PARITY_TOOL_IDS = [
  'vt.hash.lookup',
  'check.on.call.schedule',
  'get.time',
  'create.channel',
] as const;

interface SeedToolsOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
}

/**
 * Tool ids created by THIS process via createToolIfMissing. Cleanup
 * force-deletes only these — a tool that already existed before the run
 * (409 on POST) must survive cleanup.
 */
const createdToolIds = new Set<string>();

async function createToolIfMissing({
  kbnClient,
  log,
  body,
}: SeedToolsOptions & { body: Record<string, unknown> }): Promise<void> {
  try {
    await kbnClient.request({
      method: 'POST',
      path: '/api/agent_builder/tools',
      headers: AGENT_BUILDER_TOOLS_HEADERS,
      body,
    });
    createdToolIds.add(body.id as string);
    log.info(`[persona-matrix] created tool '${body.id}'`);
  } catch (error) {
    const errText = `${(error as Error)?.message ?? ''} ${
      (error as { body?: unknown })?.body ? JSON.stringify((error as { body: unknown }).body) : ''
    }`;
    const status = (error as { status?: number })?.status;
    if (status === 409 || errText.includes('already exists')) {
      log.info(`[persona-matrix] tool '${body.id}' already exists, reusing`);
      return;
    }
    throw error;
  }
}

const AGENT_TOOLS_PATH = '/api/agent_builder/agents/elastic-ai-agent';

/**
 * Attach the persona-matrix tools (and parity shims) to the default agent so the
 * converse runtime actually offers them to the model. Tools that exist as space
 * objects but are not in the agent's `configuration.tools` are invisible to the
 * agent (observed as "denied permission" in model answers).
 */
async function attachToolsToDefaultAgent({
  kbnClient,
  log,
  toolIds,
}: SeedToolsOptions & { toolIds: string[] }): Promise<void> {
  const { data: agent } = await kbnClient.request<{
    name?: string;
    description?: string;
    access_control?: { access_mode: string };
    configuration?: { tools?: Array<{ tool_ids?: string[] }> } & Record<string, unknown>;
  }>({
    method: 'GET',
    path: AGENT_TOOLS_PATH,
    headers: AGENT_BUILDER_TOOLS_HEADERS,
  });
  const existing = agent?.configuration?.tools as Array<Record<string, unknown>> | undefined;
  const currentIds = new Set(existing?.flatMap((s) => s.tool_ids ?? []) ?? []);
  const missing = toolIds.filter((id) => !currentIds.has(id));
  if (missing.length > 0) {
    // Append the missing ids as a NEW selection entry. Never rebuild existing
    // entries: selections can carry more keys than tool_ids (type, mcp_server_id,
    // ...) and collapsing them silently mutates user config.
    const merged = [...(existing ?? []), { tool_ids: missing }];
    await kbnClient.request({
      method: 'PUT',
      path: AGENT_TOOLS_PATH,
      headers: AGENT_BUILDER_TOOLS_HEADERS,
      body: {
        name: agent?.name ?? 'Elastic AI Agent',
        description: agent?.description ?? '',
        access_control: agent?.access_control ?? { access_mode: 'public' },
        configuration: { ...agent?.configuration, tools: merged },
      },
    });
    log.info(`[persona-matrix] attached tools to default agent: ${missing.join(', ')}`);
  } else {
    log.info(`[persona-matrix] default agent already has all seeded tools`);
  }
}

export async function seedPersonaMatrixTools({
  kbnClient,
  log,
  parity = false,
}: SeedToolsOptions & { parity?: boolean }): Promise<void> {
  await createToolIfMissing({
    kbnClient,
    log,
    body: {
      id: 'virustotal_lookup',
      type: 'esql',
      description:
        'Look up a file hash, URL, or domain against VirusTotal threat intelligence to check ' +
        'for known-malicious indicators. Use this to verify whether a given hash, URL, or ' +
        'domain has been flagged by security vendors.',
      tags: ['persona-matrix', 'threat-intel'],
      configuration: {
        query: `FROM ${ALERT_INDEX} | WHERE kibana.alert.rule.name LIKE "*Chrysalis*" | KEEP kibana.alert.rule.name, kibana.alert.reason | LIMIT 10`,
        params: {},
      },
    },
  });

  await createToolIfMissing({
    kbnClient,
    log,
    body: {
      id: 'on_call_lookup',
      type: 'esql',
      description:
        'Look up who is currently on call for incident response. Use this to find the primary ' +
        'on-call responder to own or escalate a security incident.',
      tags: ['persona-matrix', 'incident-response'],
      configuration: {
        query: `FROM ${ALERT_INDEX} | WHERE kibana.alert.rule.name LIKE "*Chrysalis*" | KEEP kibana.alert.rule.name, kibana.alert.severity | LIMIT 10`,
        params: {},
      },
    },
  });

  if (!parity) {
    await attachToolsToDefaultAgent({
      kbnClient,
      log,
      toolIds: [...PERSONA_MATRIX_TOOL_IDS],
    });
    return;
  }

  // Original-era tool shims for SEED_PROFILE=parity (see PERSONA_MATRIX_PARITY_TOOL_IDS docblock).
  await createToolIfMissing({
    kbnClient,
    log,
    body: {
      id: 'vt.hash.lookup',
      type: 'esql',
      description:
        'Look up a file hash, URL, or domain against VirusTotal threat intelligence to check ' +
        'for known-malicious indicators. Use this to verify whether a given hash, URL, or ' +
        'domain has been flagged by security vendors.',
      tags: ['persona-matrix', 'parity-shim'],
      configuration: {
        query: `FROM ${PARITY_TI_INDEX} | WHERE threat.indicator.file.hash.sha256 IS NOT NULL | KEEP threat.indicator.file.hash.sha256, threat.indicator.file.name, threat.indicator.description, threat.indicator.confidence | LIMIT 10`,
        params: {},
      },
    },
  });

  await createToolIfMissing({
    kbnClient,
    log,
    body: {
      id: 'check.on.call.schedule',
      type: 'esql',
      description:
        'Look up who is currently on call for incident response. Use this to find the primary ' +
        'on-call responder to own or escalate a security incident.',
      tags: ['persona-matrix', 'parity-shim'],
      configuration: {
        query: `FROM ${PARITY_ON_CALL_INDEX} | WHERE @timestamp <= NOW() AND shift_end >= NOW() | KEEP responder.name, responder.email, responder.team, rotation, shift_start, shift_end | LIMIT 1`,
        params: {},
      },
    },
  });

  await createToolIfMissing({
    kbnClient,
    log,
    body: {
      id: 'get.time',
      type: 'esql',
      description: 'Get the current time and date.',
      tags: ['persona-matrix', 'parity-shim'],
      configuration: {
        query: `FROM ${PARITY_ALERT_INDEX} | SORT @timestamp DESC | LIMIT 1 | KEEP @timestamp, kibana.alert.rule.name, kibana.alert.reason`,
        params: {},
      },
    },
  });

  await createToolIfMissing({
    kbnClient,
    log,
    body: {
      id: 'create.channel',
      type: 'esql',
      description:
        'Create a channel or case to track this security incident. Use when asked to open or ' +
        'escalate a case or notify a channel.',
      tags: ['persona-matrix', 'parity-shim'],
      configuration: {
        query: `FROM ${PARITY_ALERT_INDEX} | WHERE kibana.alert.rule.name LIKE "*Chrysalis*" | KEEP kibana.alert.rule.name, kibana.alert.reason | LIMIT 10`,
        params: {},
      },
    },
  });

  await attachToolsToDefaultAgent({
    kbnClient,
    log,
    toolIds: parity
      ? [...PERSONA_MATRIX_TOOL_IDS, ...PERSONA_MATRIX_PARITY_TOOL_IDS]
      : [...PERSONA_MATRIX_TOOL_IDS],
  });
}

export async function cleanupPersonaMatrixTools({
  kbnClient,
  log,
}: SeedToolsOptions): Promise<void> {
  for (const id of createdToolIds) {
    await kbnClient
      .request({
        method: 'DELETE',
        path: `/api/agent_builder/tools/${encodeURIComponent(id)}?force=true`,
        headers: AGENT_BUILDER_TOOLS_HEADERS,
      })
      .catch((error) => {
        const status = (error as { status?: number })?.status;
        if (status !== 404) {
          log.warning(`[persona-matrix] failed to delete tool '${id}': ${error}`);
        }
      });
  }
}
