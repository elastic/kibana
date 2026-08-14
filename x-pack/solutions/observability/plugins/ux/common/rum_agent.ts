/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RUM_ANALYST_AGENT_ID = 'observability.ux.rum-analyst';
export const RUM_ANALYST_AGENT_TYPE_ID = 'observability.ux.rum-analyst-type';
export const RUM_ANALYST_SESSION_TAG = 'ux-rum';

export const RUM_UX_TOOL_IDS = {
  getOverview: 'observability.ux.get_overview',
  findSessions: 'observability.ux.find_sessions',
  getErrors: 'observability.ux.get_errors',
  getPages: 'observability.ux.get_pages',
  getReport: 'observability.ux.get_report',
} as const;

export type RumUxToolId = (typeof RUM_UX_TOOL_IDS)[keyof typeof RUM_UX_TOOL_IDS];
