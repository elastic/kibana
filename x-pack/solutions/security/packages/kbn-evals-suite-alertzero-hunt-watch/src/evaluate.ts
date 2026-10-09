/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { HuntWatchClient } from './harness/hunt_client';

const INTERNAL_API_HEADERS = {
  'elastic-api-version': '1',
  'x-elastic-internal-origin': 'Kibana',
};

// Route surface used by the harness. Paths are inlined like the template
// suite (threat-intel-enrichment): packages expose a single public entry
// point, so subpath imports into the plugins would break that boundary.
export const ROUTES = {
  ingestThreatReport: '/internal/threat_intel/ingest_threat_report',
  candidates: '/internal/alertzero/hunt/candidates',
  huntCoordinator: '/internal/alertzero/hunt/hunt_coordinator',
} as const;

const WORKER_WORKFLOW_ID = 'system-security-hunt-continuous-threat-hunt';
const MANUAL_TRIGGER_MAX_REPORT_IDS = 10;

/**
 * Extends the base `@kbn/evals` fixture with a worker-scoped `HuntWatchClient`
 * that drives the SUT over real HTTP: the production threat-report ingest
 * route, the candidates route (with the per-batch selection assertion), and
 * the Hunt Worker manual trigger with `reportIds`, reading each hunt's
 * coordinator output back from the run_hunt_coordinator step output of the
 * child execution. Everything else (executorClient, connector, evaluators,
 * log) comes from the base fixture unchanged.
 */
export const evaluate = base.extend<
  {},
  {
    huntWatchClient: HuntWatchClient;
    huntWorkerWorkflowId: string;
  }
>({
  huntWorkerWorkflowId: [
    async ({ kbnClient }, use) => {
      void kbnClient;
      // The per-space Worker workflow id is `<managed id>-<spaceId>`
      // (managed_workflows_service.resolveWorkflowDocumentId with
      // workflowIdSuffix = spaceId). Scout runs in the default space.
      await use(`${WORKER_WORKFLOW_ID}-default`);
    },
    { scope: 'worker' },
  ],
  huntWatchClient: [
    async ({ kbnClient, log, huntWorkerWorkflowId }, use) => {
      await use(new HuntWatchClient(kbnClient, log, { huntWorkerWorkflowId }));
    },
    { scope: 'worker' },
  ],
});

export { INTERNAL_API_HEADERS, MANUAL_TRIGGER_MAX_REPORT_IDS };
