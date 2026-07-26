/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import type { McpServerSimulator } from './pagerduty_mcp_mock';
import { createPagerdutyMockMcpServer } from './pagerduty_mcp_mock';

/**
 * Deterministic connector IDs so re-runs are idempotent (create is a no-op on 409).
 * These back the `virustotal` and `pagerduty_mcp` connector-based workflow steps
 * exercised by the workflow-execution-a/b examples in persona_matrix_prompts.ts.
 *
 * Real connector types, verified against:
 *   src/platform/packages/shared/kbn-connector-specs/src/specs/virustotal/virustotal.ts (id: '.virustotal')
 *   src/platform/packages/shared/kbn-connector-specs/src/specs/pagerduty/pagerduty.ts (id: '.pagerduty_mcp')
 */
export const PERSONA_MATRIX_VIRUSTOTAL_CONNECTOR_ID = 'persona-matrix-virustotal';
export const PERSONA_MATRIX_PAGERDUTY_CONNECTOR_ID = 'persona-matrix-pagerduty';

interface SeedConnectorsOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
}

/**
 * VirusTotal API key. VirusTotal's connector spec has no config field for its
 * base URL (it is hardcoded to https://www.virustotal.com/api/v3 in
 * virustotal.ts), so unlike PagerDuty it CANNOT be pointed at a local mock via
 * connector config alone -- that would require a boot-time
 * xpack.actions.proxyUrl / customHostSettings change on the Kibana process
 * itself (see actions/server/config.ts), which is outside what a Playwright
 * beforeAll fixture can do to an already-running Kibana. Until that's wired
 * at the Scout config-set level, this connector runs against a placeholder
 * key: connector *creation* succeeds (creation only validates config shape),
 * but the live VirusTotal API call will fail auth. That's an accepted gap
 * for now -- see workflow-execution-a's expectedTools, which score the
 * agent's tool-selection (did it author+run the right connector-step
 * workflow) rather than the live API response content.
 */
const VIRUSTOTAL_API_KEY = process.env.PERSONA_MATRIX_VIRUSTOTAL_API_KEY ?? 'vt-test-placeholder';

async function createConnectorIfMissing({
  kbnClient,
  log,
  id,
  name,
  connectorTypeId,
  config,
  secrets,
}: SeedConnectorsOptions & {
  id: string;
  name: string;
  connectorTypeId: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}): Promise<void> {
  try {
    await kbnClient.request({
      method: 'POST',
      path: `/api/actions/connector/${id}`,
      body: { name, connector_type_id: connectorTypeId, config, secrets },
    });
    log.info(`[persona-matrix] created connector '${id}' (${connectorTypeId})`);
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status === 409) {
      log.info(`[persona-matrix] connector '${id}' already exists, reusing`);
      return;
    }
    throw error;
  }
}

/**
 * Seeds a VirusTotal connector and a PagerDuty (MCP) connector so the
 * workflow-execution VirusTotal-lookup and on-call-lookup examples have a
 * real connector instance to reference via `connector-id` in the generated
 * workflow YAML.
 *
 * The PagerDuty connector is backed by a real in-process MCP mock server
 * (see pagerduty_mcp_mock.ts) returning a fixed on-call schedule for the
 * Chrysalis scenario -- `pagerduty.listOncalls` workflow steps get a genuine
 * MCP round-trip with no live PagerDuty dependency. The returned server
 * handle must be passed to `cleanupWorkflowConnectors` to shut it down.
 */
export async function seedWorkflowConnectors({
  kbnClient,
  log,
}: SeedConnectorsOptions): Promise<{ pagerdutyMockServer: McpServerSimulator }> {
  await createConnectorIfMissing({
    kbnClient,
    log,
    id: PERSONA_MATRIX_VIRUSTOTAL_CONNECTOR_ID,
    name: 'Persona Matrix VirusTotal',
    connectorTypeId: '.virustotal',
    config: {},
    secrets: { authType: 'api_key_header', 'x-apikey': VIRUSTOTAL_API_KEY },
  });

  const pagerdutyMockServer = createPagerdutyMockMcpServer();
  const mockServerUrl = await pagerdutyMockServer.start();
  log.info(`[persona-matrix] PagerDuty mock MCP server started at ${mockServerUrl}`);

  await createConnectorIfMissing({
    kbnClient,
    log,
    id: PERSONA_MATRIX_PAGERDUTY_CONNECTOR_ID,
    name: 'Persona Matrix PagerDuty',
    connectorTypeId: '.pagerduty_mcp',
    config: { serverUrl: mockServerUrl },
    // The mock MCP server doesn't validate auth, but PagerDuty's connector
    // spec only declares `api_key_header` as a valid auth type (no `none`),
    // so a well-formed value is still required to pass secrets validation.
    secrets: { authType: 'api_key_header', Authorization: 'Token token=mock-not-validated' },
  });

  return { pagerdutyMockServer };
}

export async function cleanupWorkflowConnectors({
  kbnClient,
  log,
  pagerdutyMockServer,
}: SeedConnectorsOptions & { pagerdutyMockServer?: McpServerSimulator }): Promise<void> {
  for (const id of [
    PERSONA_MATRIX_VIRUSTOTAL_CONNECTOR_ID,
    PERSONA_MATRIX_PAGERDUTY_CONNECTOR_ID,
  ]) {
    await kbnClient
      .request({ method: 'DELETE', path: `/api/actions/connector/${id}` })
      .catch((error) => {
        const status = (error as { status?: number })?.status;
        if (status !== 404) {
          log.warning(`[persona-matrix] failed to delete connector '${id}': ${error}`);
        }
      });
  }

  if (pagerdutyMockServer) {
    await pagerdutyMockServer.stop().catch((error) => {
      log.warning(`[persona-matrix] failed to stop PagerDuty mock MCP server: ${error}`);
    });
  }
}
