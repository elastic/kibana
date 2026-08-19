/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { RULE_CREATION_WORKFLOW_ID, WORKFLOWS_API_VERSION } from './constants';

export const ensureConnectorAccessible = async ({
  fetch,
  connector,
  log,
}: {
  fetch: HttpHandler;
  connector: AvailableConnectorWithId;
  log: ToolingLog;
}): Promise<void> => {
  log.info(`Verifying AI connector: ${connector.name} (${connector.id})`);
  try {
    await fetch(`/api/actions/connector/${encodeURIComponent(connector.id)}`, { method: 'GET' });
    log.info('AI connector is accessible — proceeding with eval run');
  } catch (err) {
    throw new Error(
      `AI connector "${connector.name}" (${connector.id}) is not accessible. ` +
        `Ensure it is configured and enabled in Stack Management > Connectors ` +
        `before running this eval suite. ` +
        `Original error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};

/**
 * Asserts the managed rule-creation workflow the pnd plugin installs at start is present, and
 * returns its yaml.
 *
 * This deliberately does NOT create the workflow. The eval must measure the artifact production
 * ships — if the suite carried its own copy of the yaml, or created one on the fly, it would score
 * green against a document that no user ever runs while the real workflow regressed unobserved.
 * A missing workflow is an environment failure and should fail loudly here rather than surface as
 * mystery zeroes across every evaluator.
 */
export const assertWorkflowInstalled = async ({
  fetch,
  log,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<{ yaml: string }> => {
  log.info(`Checking managed workflow: ${RULE_CREATION_WORKFLOW_ID}`);
  try {
    const workflow = await fetch<{ yaml: string }>(
      `/api/workflows/workflow/${RULE_CREATION_WORKFLOW_ID}`,
      {
        method: 'GET',
        version: WORKFLOWS_API_VERSION,
        headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      }
    );
    log.info('Managed workflow is installed — proceeding with eval run');
    return workflow;
  } catch (err) {
    throw new Error(
      `Managed workflow "${RULE_CREATION_WORKFLOW_ID}" is not installed. It is installed at ` +
        `plugin start by the pnd plugin (installStatic / PND_WATCH_WORKFLOW_IDS), so this ` +
        `usually means the pnd plugin is disabled or the Workflows feature is unavailable. ` +
        `This suite does not create the workflow itself: it must measure the workflow that ships. ` +
        `Original error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};
