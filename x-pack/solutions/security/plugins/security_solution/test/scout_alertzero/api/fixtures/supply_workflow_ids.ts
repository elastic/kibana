/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deployment-wide supply workflow ids, inlined so the Scout fixtures do not load every
 * managed definition (and its YAML) through `@kbn/workflows/managed`. The Jest test
 * `server/threat_intel/scout_supply_workflow_ids.test.ts` pins them to that package.
 */
export const SUPPLY_WORKFLOW_IDS = {
  ingest: 'system-security-threat-intel-ingest-feeds',
  enrich: 'system-security-threat-intel-enrich-report',
} as const;

export type SupplyWorkflowKey = keyof typeof SUPPLY_WORKFLOW_IDS;
