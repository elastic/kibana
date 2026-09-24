/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Plugins that must simply be present for significant events to work.
 * To require a new plugin, add its name here.
 *
 * Note: workflowsManagement requires workflowsExtensions, so the latter is
 * technically covered, but both are listed explicitly to stay correct if that
 * relationship changes.
 */
export const SIGNIFICANT_EVENTS_REQUIRED_PLUGINS = [
  'workflowsExtensions',
  'workflowsManagement',
  'searchInferenceEndpoints',
  'agentBuilder',
] as const;

export type SignificantEventsRequiredPlugin = (typeof SIGNIFICANT_EVENTS_REQUIRED_PLUGINS)[number];

/**
 * Identifies the first significant events requirement that is not met. The UI
 * uses it to show a tailored message on why significant events is unavailable.
 *
 * `feature_flag` is the outermost gate (the significant events Technical Preview
 * flag); it is listed first to match the evaluation order on the server.
 */
export type SignificantEventsUnavailableReason =
  | 'feature_flag'
  | 'project_type'
  | 'pricing_tier'
  | 'license'
  | SignificantEventsRequiredPlugin;

/** Read/write access a user holds on a single significant events resource. */
export interface SignificantEventsResourcePrivileges {
  read: boolean;
  write: boolean;
}

/** Resource-specific privileges of the requesting user. */
export interface SignificantEventsUserPrivileges {
  knowledgeIndicators: SignificantEventsResourcePrivileges;
  significantEvents: SignificantEventsResourcePrivileges;
}

/** Deployment-level availability, resolved before per-user privileges are layered on. */
export type SignificantEventsDeploymentAvailability =
  | { available: true }
  | { available: false; reason: SignificantEventsUnavailableReason };

/**
 * The availability response the UI consumes. `available` stays strictly
 * deployment-level; when available, `privileges` gates resource-specific actions.
 */
export type SignificantEventsAvailabilityResponse =
  | { available: true; privileges: SignificantEventsUserPrivileges }
  | { available: false; reason: SignificantEventsUnavailableReason };
