/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CHRYSALIS_CHRYSALIS_AGENT_ID = 'chrysalis-hunting-agent';

export const CHRYSALIS_INSIGHTS_SEED_LABEL = 'chrysalis-insights-gold-v0';

export const CHRYSALIS_INSIGHTS_ALERTS_INDEX = '.alerts-security.alerts-default';

export const CHRYSALIS_WORKFLOW_TEMPLATE_NAMES = [
  'vt-hash-lookup',
  'create-case',
  'create-channel',
] as const;

/** ESQL tools referenced by the Chrysalis agent. Exported from Chrysalis's harness. */
export const CHRYSALIS_ESQL_TOOL_NAMES = ['get.time', 'check.on.call.schedule'] as const;
