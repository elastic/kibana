/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';

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
 * VirusTotal API key. In CI/Scout runs this must come from a real (or sandboxed)
 * VirusTotal API key via env var; falls back to a placeholder that will make the
 * connector's own API calls fail cleanly with an auth error rather than fail
 * connector *creation* -- creation only validates the config shape, not that the
 * key is live, so tests can still assert on ExpectedToolCalled / step invocation
 * even when a real key isn't provisioned in every environment.
 */
const VIRUSTOTAL_API_KEY = process.env.PERSONA_MATRIX_VIRUSTOTAL_API_KEY ?? 'vt-test-placeholder';

/**
 * PagerDuty API key, same placeholder-fallback rationale as above.
 */
const PAGERDUTY_API_KEY =
  process.env.PERSONA_MATRIX_PAGERDUTY_API_KEY ?? 'Token token=pd-test-placeholder';

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
 */
export async function seedWorkflowConnectors({
  kbnClient,
  log,
}: SeedConnectorsOptions): Promise<void> {
  await createConnectorIfMissing({
    kbnClient,
    log,
    id: PERSONA_MATRIX_VIRUSTOTAL_CONNECTOR_ID,
    name: 'Persona Matrix VirusTotal',
    connectorTypeId: '.virustotal',
    config: {},
    secrets: { 'x-apikey': VIRUSTOTAL_API_KEY },
  });

  await createConnectorIfMissing({
    kbnClient,
    log,
    id: PERSONA_MATRIX_PAGERDUTY_CONNECTOR_ID,
    name: 'Persona Matrix PagerDuty',
    connectorTypeId: '.pagerduty_mcp',
    config: {},
    secrets: { Authorization: PAGERDUTY_API_KEY },
  });
}

export async function cleanupWorkflowConnectors({
  kbnClient,
  log,
}: SeedConnectorsOptions): Promise<void> {
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
}
