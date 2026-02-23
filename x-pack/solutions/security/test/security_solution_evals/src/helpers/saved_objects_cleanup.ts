/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';

/**
 * Like `kbnClient.savedObjects.cleanStandardList()`, but intentionally excludes the `action`
 * saved object type so eval-created connectors are not deleted between tests.
 *
 * This is important because @kbn/evals creates a non-preconfigured connector saved object and
 * reuses it across tests in a worker; deleting `action` objects would break subsequent requests
 * to `/api/agent_builder/converse` and `/internal/inference/prompt`.
 */
const STANDARD_LIST_TYPES_EXCEPT_ACTION = [
  'url',
  'index-pattern',
  'query',
  'alert',
  'graph-workspace',
  'tag',
  'visualization',
  'canvas-element',
  'canvas-workpad',
  'dashboard',
  'search',
  'lens',
  'links',
  'map',
  // cases saved objects
  'cases',
  'cases-comments',
  'cases-user-actions',
  'cases-configure',
  'cases-connector-mappings',
  // synthetics based objects
  'synthetics-monitor',
  'synthetics-monitor-multi-space',
  'uptime-dynamic-settings',
  'synthetics-privates-locations',
  'synthetics-private-location',
  'synthetics-param',
  'osquery-saved-query',
  'osquery-pack',
  'infrastructure-ui-source',
  'metrics-data-source',
  'metrics-explorer-view',
  'inventory-view',
  'infrastructure-monitoring-log-view',
  'apm-indices',
  // Fleet saved object types
  'ingest_manager_settings',
  'ingest-outputs',
  'ingest-download-sources',
  'ingest-agent-policies',
  'fleet-agent-policies',
  'ingest-package-policies',
  'fleet-package-policies',
  'epm-packages',
  'epm-packages-assets',
  'fleet-preconfiguration-deletion-record',
  'fleet-fleet-server-host',
  'fleet-proxy',
  'fleet-uninstall-tokens',
  'fleet-space-settings',
] as const;

export async function cleanStandardListExceptAction(
  kbnClient: KbnClient,
  options?: { space?: string }
) {
  await kbnClient.savedObjects.clean({
    types: [...STANDARD_LIST_TYPES_EXCEPT_ACTION],
    space: options?.space,
  });
}


