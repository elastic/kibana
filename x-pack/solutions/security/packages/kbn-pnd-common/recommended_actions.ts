/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Response actions an analysis can recommend, and the capability that would carry each one out.
 *
 * Scoped to what Elastic can actually action today: every entry maps to a supported Endpoint
 * response action, a Kibana capability, or the threat-hunting skill. An action type absent here
 * is one no recommendation should name, because a recommendation nothing can execute reads as a
 * plan when it is only a wish — `kill_process`, `suspend_process`, `execute`, `get_file`,
 * `upload`, `runscript` and `memory_dump` are all deliberately out.
 *
 * `capability_ref` is documentation, not dispatch: nothing in this repo executes a recommended
 * action, so the reference names the capability an executor *would* need rather than a route
 * anything calls today.
 */
export const RESPONSE_ACTION_CAPABILITIES = {
  isolate_host: 'endpoint.isolate',
  release_host: 'endpoint.release',
  scan_host: 'endpoint.scan',
  list_running_processes: 'endpoint.running_procs',
  hunt_indicator: 'threat_hunting.indicator',
  create_case: 'cases.create',
} as const;

/**
 * Actions an analyst performs outside Kibana.
 *
 * Listed so a recommendation can name real containment Elastic cannot reach — blocking a C2
 * address at the perimeter is the demo's own example — rather than silently narrowing the
 * recommendation to whatever happens to be automatable.
 */
export const MANUAL_RESPONSE_ACTION_TYPES = ['block_indicator', 'revoke_user_account'] as const;

export const RESPONSE_ACTION_PRIORITIES = ['immediate', 'investigation', 'hardening'] as const;

export type KibanaResponseActionType = keyof typeof RESPONSE_ACTION_CAPABILITIES;
export type ManualResponseActionType = (typeof MANUAL_RESPONSE_ACTION_TYPES)[number];
export type ResponseActionType = KibanaResponseActionType | ManualResponseActionType;
export type RecommendedResponseActionPriority = (typeof RESPONSE_ACTION_PRIORITIES)[number];
export type ResponseActionCapabilityRef =
  (typeof RESPONSE_ACTION_CAPABILITIES)[KibanaResponseActionType];

/**
 * What an action would touch. Every field is present so "this action names no users" is a claim
 * the producer makes rather than a key a reader has to guess the absence of.
 */
export interface RecommendedResponseActionTargets {
  hosts: string[];
  users: string[];
  ips: string[];
  alert_ids: string[];
}

interface RecommendedResponseActionBase {
  title: string;
  rationale: string;
  priority: RecommendedResponseActionPriority;
  targets: RecommendedResponseActionTargets;
}

export type KibanaRecommendedResponseAction = {
  [ActionType in KibanaResponseActionType]: RecommendedResponseActionBase & {
    action_type: ActionType;
    execution: 'kibana_api';
    capability_ref: (typeof RESPONSE_ACTION_CAPABILITIES)[ActionType];
  };
}[KibanaResponseActionType];

export type ManualRecommendedResponseAction = RecommendedResponseActionBase & {
  action_type: ManualResponseActionType;
  execution: 'manual';
  capability_ref?: never;
};

/**
 * One response action an analysis recommends for a human to approve.
 *
 * `execution` is the discriminant, and it is the honest one: `kibana_api` means an executor
 * could carry the action out through the named capability, `manual` means the analyst does it
 * themselves. Neither is executed here.
 */
export type RecommendedResponseAction =
  | KibanaRecommendedResponseAction
  | ManualRecommendedResponseAction;
