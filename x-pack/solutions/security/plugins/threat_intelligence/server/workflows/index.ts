/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

/**
 * Built-in threat intelligence workflow IDs and the YAML files that define
 * them. The actual `createWorkflow`/`ensureWorkflow` plumbing lives in a
 * follow-up PR — registering YAML workflows from a plugin requires:
 *
 *  1. The `workflowsManagement` server plugin's setup contract to expose
 *     `createWorkflow({ yaml, id }, spaceId, request)`. (The Streams plugin
 *     uses this pattern in `continuous_extraction_workflow.ts`.)
 *  2. A scoped Kibana request available at start time (via a system request
 *     or by deferring to first user request).
 *
 * Until that PR lands, the bundled YAMLs are shipped as static assets the
 * operator can `POST /api/workflowManagement/workflows` themselves.
 */
export const BUILTIN_WORKFLOWS = [
  {
    id: 'threat-intel.source_ingestion',
    description:
      'Pull enabled .kibana-threat-intel-sources and write normalized reports to .kibana-threat-reports',
    yamlPath: 'source_ingestion.yaml',
  },
  {
    id: 'threat-intel.nl_extraction_behavioral',
    description:
      'Extract IOCs + behaviors from freshly ingested threat reports (deduped by content_fingerprint)',
    yamlPath: 'nl_extraction_behavioral.yaml',
  },
  {
    id: 'threat-intel.digest_delivery',
    description: 'Render and deliver per-subscription threat intelligence digests',
    yamlPath: 'digest_delivery.yaml',
  },
  {
    id: 'threat-intel.hit_provenance_backfill',
    description:
      'Attribute Detection Engine alerts back to their originating .kibana-threat-reports-* docs (Layers 1/2)',
    yamlPath: 'hit_provenance_backfill.yaml',
  },
] as const;

/**
 * Placeholder for the workflow installer. Wired up once `workflowsManagement`
 * is added to `optionalPlugins` and its setup contract is exposed.
 */
export const installBuiltinWorkflows = async (_args: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  // intentional no-op until the workflowsManagement createWorkflow integration lands
};
