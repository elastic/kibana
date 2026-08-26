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

export const ATTACK_DISCOVERY_ASSET_CRITICALITY_LEVELS = [
  'low_impact',
  'medium_impact',
  'high_impact',
  'extreme_impact',
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
export type AttackDiscoveryAssetCriticalityLevel =
  (typeof ATTACK_DISCOVERY_ASSET_CRITICALITY_LEVELS)[number];

export type AttackDiscoveryKillProcessExecutionParams =
  | {
      process_entity_id: string;
      process_name?: string;
      pid?: number;
    }
  | {
      process_entity_id?: never;
      pid: number;
      process_name?: string;
    }
  | {
      process_entity_id?: never;
      pid?: never;
      process_name: string;
    };

export interface AttackDiscoverySetAssetCriticalityExecutionParams {
  criticality_level: AttackDiscoveryAssetCriticalityLevel;
}

export interface AttackDiscoveryExecutionParamsByActionType {
  isolate_host: never;
  kill_process: AttackDiscoveryKillProcessExecutionParams;
  hunt_process_persistence: never;
  create_case: never;
  set_asset_criticality: AttackDiscoverySetAssetCriticalityExecutionParams;
  analyze_exfiltration_ips: never;
}

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
    execution_params?: AttackDiscoveryExecutionParamsByActionType[ActionType];
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
