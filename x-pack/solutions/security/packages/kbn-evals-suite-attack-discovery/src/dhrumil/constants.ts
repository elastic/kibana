/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DHRUMIL_CHRYSALIS_AGENT_ID = 'chrysalis-hunting-agent';

export const DHRUMIL_INSIGHTS_SEED_LABEL = 'dhrumil-insights-gold-v0';

export const DHRUMIL_INSIGHTS_ALERTS_INDEX = '.alerts-security.alerts-default';

export const DHRUMIL_WORKFLOW_TEMPLATE_NAMES = [
  'vt-hash-lookup',
  'create-case',
  'create-channel',
] as const;

/** ESQL tools referenced by the Chrysalis agent. Exported from Dhrumil's harness. */
export const DHRUMIL_ESQL_TOOL_NAMES = ['get.time', 'check.on.call.schedule'] as const;
