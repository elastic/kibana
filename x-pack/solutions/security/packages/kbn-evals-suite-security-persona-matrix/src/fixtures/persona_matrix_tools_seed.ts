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

export const PERSONA_MATRIX_TOOL_IDS = ['virustotal_lookup', 'on_call_lookup'] as const;

interface SeedToolsOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
}

async function createToolIfMissing({
  kbnClient,
  log,
  body,
}: SeedToolsOptions & { body: Record<string, unknown> }): Promise<void> {
  const toolPath = `/api/agent_builder/tools/${encodeURIComponent(String(body.id))}`;
  try {
    await kbnClient.request({
      method: 'GET',
      path: toolPath,
      headers: AGENT_BUILDER_TOOLS_HEADERS,
    });
    // Tool exists from a previous run — delete first so the POST below always
    // installs the CURRENT definition (verified live: duplicate POST returns
    // 400 "already exists", and DELETE-then-POST is the upsert path).
    await kbnClient.request({
      method: 'DELETE',
      path: toolPath,
      headers: AGENT_BUILDER_TOOLS_HEADERS,
    });
    log.info(`[persona-matrix] removed stale tool '${body.id}', reinstalling`);
  } catch {
    // 404: tool not present, nothing to clean up
  }
  await kbnClient.request({
    method: 'POST',
    path: '/api/agent_builder/tools',
    headers: AGENT_BUILDER_TOOLS_HEADERS,
    body,
  });
  log.info(`[persona-matrix] created tool '${body.id}'`);
}

export async function seedPersonaMatrixTools({ kbnClient, log }: SeedToolsOptions): Promise<void> {
  await createToolIfMissing({
    kbnClient,
    log,
    body: {
      id: 'virustotal_lookup',
      type: 'esql',
      description:
        'Look up a file hash, URL, or domain against VirusTotal threat intelligence to check ' +
        'for known-malicious indicators. Returns the verdict (benign/malicious), detection ' +
        'ratio, and classification. Use this to verify whether a given hash, URL, or ' +
        'domain has been flagged by security vendors.',
      tags: ['persona-matrix', 'threat-intel'],
      configuration: {
        // Queries the eval-seeded mock verdict index (see env_seeds.ts) so the
        // tool returns a coherent VirusTotal-style answer without any network
        // access or real VirusTotal subscription. `params` is REQUIRED by the
        // esql tool schema (verified live: omitting it fails with "[params]:
        // expected value of type [object] but got [undefined]"; a params entry
        // not referenced by a {{placeholder}} fails with "Defined parameters
        // not used in query"). The {{hash}} placeholder drives the input
        // schema; params stays empty.
        query:
          'FROM ti-mock-default | WHERE threat_intel.indicator.value == "{{hash}}" ' +
          '| KEEP threat_intel.verdict, threat_intel.detection_ratio, threat_intel.classification | LIMIT 5',
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
        // Queries the eval-seeded on-call schedule index (see env_seeds.ts A5).
        // Previously this pointed at the alerts index, which has no responder
        // fields — making workflow-execution-b structurally unanswerable.
        query:
          `FROM on-call-schedule | WHERE is_primary == true ` +
          `| KEEP name, email, slack_handle, shift_start, shift_end | LIMIT 5`,
        // esql tool schema requires `params` present (even empty) — omitting
        // it fails validation with "expected value of type [object] but got
        // [undefined]" (verified live).
        params: {},
      },
    },
  });
}

export async function cleanupPersonaMatrixTools({
  kbnClient,
  log,
}: SeedToolsOptions): Promise<void> {
  for (const id of PERSONA_MATRIX_TOOL_IDS) {
    await kbnClient
      .request({
        method: 'DELETE',
        path: `/api/agent_builder/tools/${encodeURIComponent(id)}`,
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
