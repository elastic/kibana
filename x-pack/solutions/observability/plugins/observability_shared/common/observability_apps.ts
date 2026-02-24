/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * App IDs for Observability applications.
 * Used to set the Observability Agent as default in the AI flyout.
 *
 * Note: These are app IDs (from `core.application.register`), not plugin IDs.
 * To verify: check the URL `/app/{appId}/...`
 */
export const OBSERVABILITY_APP_IDS = [
  'apm',
  'slo',
  'synthetics',
  'observability-overview',
  'logs',
  'metrics',
  'ux',
  'profiling',
  'uptime',
  'observabilityOnboarding',
  'streams',
] as const;

/**
 * Type representing valid Observability app IDs.
 * Use this for type-safe app ID checks.
 */
export type ObservabilityAppId = (typeof OBSERVABILITY_APP_IDS)[number];

/**
 * The Observability Agent ID used for the AI Agent flyout.
 */
export const OBSERVABILITY_AGENT_ID = 'observability.agent';

/**
 * Session tag used for Observability Agent conversations.
 */
export const OBSERVABILITY_SESSION_TAG = 'observability';
