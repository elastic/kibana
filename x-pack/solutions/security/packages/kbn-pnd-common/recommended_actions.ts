/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ATTACK_DISCOVERY_ACTION_CAPABILITIES = {
  isolate_host: 'endpoint.isolate',
  kill_process: 'endpoint.kill_process',
  hunt_process_persistence: 'endpoint.running_procs',
  create_case: 'cases.create',
  set_asset_criticality: 'asset_criticality.set',
  analyze_exfiltration_ips: 'threat_hunting.exfil_ips',
} as const;

export const ATTACK_DISCOVERY_MANUAL_ACTION_TYPES = [
  'revoke_user_account',
  'enforce_step_up_auth',
  'onboard_integration',
] as const;

export const ATTACK_DISCOVERY_RECOMMENDED_ACTION_PRIORITIES = [
  'immediate',
  'investigation',
  'hardening',
] as const;

export type AttackDiscoveryKibanaActionType = keyof typeof ATTACK_DISCOVERY_ACTION_CAPABILITIES;
export type AttackDiscoveryManualActionType = (typeof ATTACK_DISCOVERY_MANUAL_ACTION_TYPES)[number];
export type AttackDiscoveryRecommendedActionType =
  | AttackDiscoveryKibanaActionType
  | AttackDiscoveryManualActionType;
export type AttackDiscoveryRecommendedActionPriority =
  (typeof ATTACK_DISCOVERY_RECOMMENDED_ACTION_PRIORITIES)[number];
export type AttackDiscoveryCapabilityRef =
  (typeof ATTACK_DISCOVERY_ACTION_CAPABILITIES)[AttackDiscoveryKibanaActionType];

export interface AttackDiscoveryRecommendedActionTargets {
  hosts: string[];
  users: string[];
  ips: string[];
  alert_ids: string[];
}

interface AttackDiscoveryRecommendedActionBase {
  title: string;
  rationale: string;
  priority: AttackDiscoveryRecommendedActionPriority;
  targets: AttackDiscoveryRecommendedActionTargets;
}

export type AttackDiscoveryKibanaRecommendedAction = {
  [ActionType in AttackDiscoveryKibanaActionType]: AttackDiscoveryRecommendedActionBase & {
    action_type: ActionType;
    execution: 'kibana_api';
    capability_ref: (typeof ATTACK_DISCOVERY_ACTION_CAPABILITIES)[ActionType];
  };
}[AttackDiscoveryKibanaActionType];

export type AttackDiscoveryManualRecommendedAction = AttackDiscoveryRecommendedActionBase & {
  action_type: AttackDiscoveryManualActionType;
  execution: 'manual';
  capability_ref?: never;
};

export type AttackDiscoveryRecommendedAction =
  | AttackDiscoveryKibanaRecommendedAction
  | AttackDiscoveryManualRecommendedAction;
