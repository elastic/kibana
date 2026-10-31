/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { PARITY_WORKFLOWS, PARITY_CASE_TAG, type ParityWorkflow } from './parity_workflows';
import { CHRYSALIS_PARITY_AGENT } from './chrysalis_parity_agent';
import { seedProfile } from './chrysalis_seed';
import type { AgentProfile } from '../agent_profile';

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

// Written by the parity seed (chrysalis_parity_docs.ts); parity seeding never
// writes ALERT_INDEX.
const PARITY_ON_CALL_INDEX = 'on-call-schedule';

export const PERSONA_MATRIX_TOOL_IDS = ['virustotal_lookup', 'on_call_lookup'] as const;

/**
 * Original-benchmark tool ids, referenced verbatim by the parity prompts and by
 * the dedicated parity agent. Seeded only when SEED_PROFILE=parity or
 * AGENT_PROFILE=chrysalis-parity — minimal-profile runs keep the two tools
 * above only, matching the published matrix environment.
 */
export const PERSONA_MATRIX_PARITY_TOOL_IDS = [
  'vt.hash.lookup',
  'check.on.call.schedule',
  'get.time',
  'create.case',
  'create.channel',
] as const;

/**
 * Bodies for the parity tools. `vt.hash.lookup` / `create.case` /
 * `create.channel` are workflow tools (their workflows are seeded first, see
 * PARITY_WORKFLOWS); `check.on.call.schedule` / `get.time` stay ES|QL tools.
 *
 * `check.on.call.schedule` deliberately KEEPs only `responder.*` fields: the
 * external benchmark's live runs returned `[[null × 6]]` for this tool ~29
 * times because its KEEP list (`name, email, slack_handle, role, team,
 * is_primary`) references fields that do not exist on the seeded on-call doc
 * (which nests everything under `responder.*`). Parity of the tool contract,
 * not of that bug.
 */
const PARITY_TOOLS: ReadonlyArray<Record<string, unknown>> = [
  {
    id: 'vt.hash.lookup',
    type: 'workflow',
    description:
      'Analyze a file hash (MD5, SHA-1, or SHA-256) with VirusTotal. Returns the detection verdict ' +
      '(how many AV engines flagged it as malicious), reputation, names, and analysis stats. Use this ' +
      'to confirm whether a hash observed in the environment is known malware.',
    tags: ['security', 'threat-intel', 'virustotal'],
    configuration: { workflow_id: 'vt-hash-lookup' },
  },
  {
    id: 'check.on.call.schedule',
    type: 'esql',
    description:
      'Query the on-call schedule to find the current responder(s). Returns the name, email, Slack ' +
      'handle, and team of whoever is on call right now. Use this to know who to notify and add to an ' +
      'incident channel.',
    tags: ['security', 'incident-response', 'on-call'],
    configuration: {
      query: `FROM ${PARITY_ON_CALL_INDEX} | WHERE shift_start <= NOW() AND shift_end >= NOW() | KEEP responder.name, responder.email, responder.slack_handle, responder.team, rotation, shift_start, shift_end | LIMIT 10`,
      params: {},
    },
  },
  {
    id: 'get.time',
    type: 'esql',
    description:
      'Get the current date and time (UTC). Use this for naming incident channels/cases and for ' +
      'timestamps in summaries.',
    tags: ['utility', 'time'],
    configuration: {
      query: 'ROW current_time = NOW(), timezone = "UTC"',
      params: {},
    },
  },
  {
    id: 'create.case',
    type: 'workflow',
    description:
      'Create a case in Elastic Security for a confirmed incident. Provide a title, a markdown ' +
      'description (include attack chain, IOCs, VirusTotal verdict, impacted hosts/users, and ' +
      'recommended actions), and a severity (low/medium/high/critical). Use this only after ' +
      'confirming a true positive.',
    tags: ['security', 'incident-response', 'cases'],
    configuration: { workflow_id: 'create-case' },
  },
  {
    id: 'create.channel',
    type: 'workflow',
    description:
      'Create a Slack incident channel for a confirmed attack discovery, automatically invite the ' +
      'on-call responder (looked up by email), and post the incident summary message. A unique ' +
      'suffix is appended to the channel name automatically, so you can pass a clean base name ' +
      '(lowercase, hyphenated, no spaces e.g. incident-chrysalis-srv-win-defend-01) without ' +
      'worrying about collisions. Provide channel_name (base) and message (the incident summary to ' +
      'post). oncall_email defaults to the current on-call responder.',
    tags: ['security', 'incident-response', 'slack'],
    configuration: { workflow_id: 'create-channel' },
  },
];

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

/**
 * Workflow ids created by THIS process via createWorkflowIfMissing. Like
 * createdToolIds: a pre-existing workflow (409 on POST) must survive cleanup.
 */
const createdWorkflowIds = new Set<string>();

/** True when THIS process created the parity agent (400 "already exists" otherwise). */
let createdParityAgent = false;

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
const WORKFLOWS_PATH = '/api/workflows/workflow';
const SKILLS_PATH = '/api/agent_builder/skills';
const PARITY_AGENT_PATH = `/api/agent_builder/agents/${CHRYSALIS_PARITY_AGENT.id}`;
const CASES_FIND_PATH = '/api/cases/_find';

const isAlreadyExists = (error: unknown): boolean => {
  const errText = `${(error as Error)?.message ?? ''} ${
    (error as { body?: unknown })?.body ? JSON.stringify((error as { body: unknown }).body) : ''
  }`;
  const status = (error as { status?: number })?.status;
  // Agent create returns 400 (not 409) for a duplicate id, so the message must
  // confirm it; a bare 400 is a real validation error and must rethrow.
  return status === 409 || errText.includes('already exists');
};

async function createWorkflowIfMissing({
  kbnClient,
  log,
  workflow,
}: SeedToolsOptions & { workflow: ParityWorkflow }): Promise<void> {
  try {
    await kbnClient.request({
      method: 'POST',
      path: WORKFLOWS_PATH,
      headers: AGENT_BUILDER_TOOLS_HEADERS,
      body: { id: workflow.id, yaml: workflow.yaml },
    });
    createdWorkflowIds.add(workflow.id);
    log.info(`[persona-matrix] created workflow '${workflow.id}'`);
  } catch (error) {
    if (isAlreadyExists(error)) {
      log.info(`[persona-matrix] workflow '${workflow.id}' already exists, reusing`);
      return;
    }
    throw error;
  }
}

/**
 * Create the dedicated parity agent. Skill ids are intersected against
 * GET /api/agent_builder/skills first: the create route 400s on unknown skill
 * ids, and the benchmark's skill list predates skills added since.
 */
async function createParityAgentIfMissing({ kbnClient, log }: SeedToolsOptions): Promise<void> {
  const wantedSkills = new Set(CHRYSALIS_PARITY_AGENT.skillIds);
  const { data: skillsResponse } = await kbnClient.request<{
    results?: Array<{ id?: string }>;
  }>({
    method: 'GET',
    path: SKILLS_PATH,
    headers: AGENT_BUILDER_TOOLS_HEADERS,
  });
  const available = new Set(
    (skillsResponse.results ?? []).map((s) => s.id).filter((id): id is string => !!id)
  );
  const skillIds = [...wantedSkills].filter((id) => available.has(id));
  const dropped = [...wantedSkills].filter((id) => !available.has(id));
  if (dropped.length > 0) {
    log.warning(
      `[persona-matrix] parity agent: dropping ${
        dropped.length
      } skill ids not present in this install: ${dropped.join(', ')}`
    );
  }

  try {
    await kbnClient.request({
      method: 'POST',
      path: '/api/agent_builder/agents',
      headers: AGENT_BUILDER_TOOLS_HEADERS,
      body: {
        id: CHRYSALIS_PARITY_AGENT.id,
        name: CHRYSALIS_PARITY_AGENT.name,
        description: CHRYSALIS_PARITY_AGENT.description,
        avatar_color: CHRYSALIS_PARITY_AGENT.avatarColor,
        avatar_symbol: CHRYSALIS_PARITY_AGENT.avatarSymbol,
        labels: [...CHRYSALIS_PARITY_AGENT.labels],
        access_control: { access_mode: 'public' },
        configuration: {
          instructions: CHRYSALIS_PARITY_AGENT.instructions,
          tools: [{ tool_ids: [...CHRYSALIS_PARITY_AGENT.toolIds] }],
          skill_ids: skillIds,
          enable_elastic_capabilities: CHRYSALIS_PARITY_AGENT.enableElasticCapabilities,
        },
      },
    });
    createdParityAgent = true;
    log.info(
      `[persona-matrix] created parity agent '${CHRYSALIS_PARITY_AGENT.id}' with ${skillIds.length}/${wantedSkills.size} skills`
    );
  } catch (error) {
    if (isAlreadyExists(error)) {
      log.info(
        `[persona-matrix] parity agent '${CHRYSALIS_PARITY_AGENT.id}' already exists, reusing`
      );
      return;
    }
    throw error;
  }
}

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
    access_control?: { access_mode: string; entries?: unknown };
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
        // The update route validates access_control with a mode-only schema
        // (no `entries`), and the GET response since #290353 includes
        // `entries: []`. Forward only the mode; entries are managed by the
        // separate PUT /agents/{id}/access_control endpoint.
        access_control: { access_mode: agent?.access_control?.access_mode ?? 'public' },
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
  profile = 'default',
}: SeedToolsOptions & { profile?: AgentProfile }): Promise<void> {
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

  // Parity tools are needed when the parity DATA profile is active (prompts
  // reference these tool names) or when the dedicated parity agent profile is
  // active (its configuration carries these exact tool ids).
  const seedParityTools = seedProfile === 'parity' || profile === 'chrysalis-parity';

  if (!seedParityTools) {
    await attachToolsToDefaultAgent({
      kbnClient,
      log,
      toolIds: [...PERSONA_MATRIX_TOOL_IDS],
    });
    return;
  }

  for (const workflow of PARITY_WORKFLOWS) {
    await createWorkflowIfMissing({ kbnClient, log, workflow });
  }
  for (const body of PARITY_TOOLS) {
    await createToolIfMissing({ kbnClient, log, body });
  }

  if (profile === 'chrysalis-parity') {
    // The parity agent carries the parity tools itself; attaching them to the
    // default agent too would leak parity tools into every other conversation.
    await createParityAgentIfMissing({ kbnClient, log });
    return;
  }

  await attachToolsToDefaultAgent({
    kbnClient,
    log,
    toolIds: [...PERSONA_MATRIX_TOOL_IDS, ...PERSONA_MATRIX_PARITY_TOOL_IDS],
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

  for (const id of createdWorkflowIds) {
    await kbnClient
      .request({
        method: 'DELETE',
        // Hard delete: soft-deleted workflows keep their ids reserved and the
        // next run's create would 409 with a tombstone.
        path: `/api/workflows/workflow/${encodeURIComponent(
          id
        )}?force=true&acknowledgeAclLoss=true`,
        headers: AGENT_BUILDER_TOOLS_HEADERS,
      })
      .catch((error) => {
        const status = (error as { status?: number })?.status;
        if (status !== 404) {
          log.warning(`[persona-matrix] failed to delete workflow '${id}': ${error}`);
        }
      });
  }

  if (createdParityAgent) {
    await kbnClient
      .request({
        method: 'DELETE',
        path: PARITY_AGENT_PATH,
        headers: AGENT_BUILDER_TOOLS_HEADERS,
      })
      .catch((error) => {
        const status = (error as { status?: number })?.status;
        if (status !== 404) {
          log.warning(
            `[persona-matrix] failed to delete parity agent '${CHRYSALIS_PARITY_AGENT.id}': ${error}`
          );
        }
      });
  }

  // create.case runs the seeded create-case workflow, which tags every case it
  // opens with PARITY_CASE_TAG. Clean those regardless of who created the
  // workflow — a reused (pre-existing) workflow still opens cases during a run.
  try {
    const { data: found } = await kbnClient.request<{
      cases?: Array<{ id: string }>;
    }>({
      method: 'GET',
      path: CASES_FIND_PATH,
      query: { tags: PARITY_CASE_TAG },
      headers: AGENT_BUILDER_TOOLS_HEADERS,
    });
    const caseIds = (found.cases ?? []).map((c) => c.id);
    if (caseIds.length > 0) {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/cases?ids=${encodeURIComponent(JSON.stringify(caseIds))}`,
        headers: AGENT_BUILDER_TOOLS_HEADERS,
      });
      log.info(`[persona-matrix] deleted ${caseIds.length} parity case(s)`);
    }
  } catch (error) {
    log.warning(`[persona-matrix] parity case cleanup failed: ${error}`);
  }
}
