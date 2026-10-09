/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_FEATURE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';

/** Security's public role API, used with `createOnly` so an existing role is never overwritten. */
export const SECURITY_ROLE_API_VERSION = '2023-10-31' as const;
export const buildSecurityRoleUrl = (roleName: string) =>
  `/api/security/role/${encodeURIComponent(roleName)}`;

interface IndexPrivileges {
  names: string[];
  privileges: string[];
}

/** A role in the shape Security's public role API accepts. */
export interface WorkerRolePayload {
  description: string;
  elasticsearch: { cluster: string[]; indices: IndexPrivileges[]; run_as: string[] };
  kibana: Array<{ spaces: string[]; base: string[]; feature: Record<string, string[]> }>;
}

export interface WorkerRoleDefinition {
  /** Used for both the role and the service account. */
  name: string;
  role: WorkerRolePayload;
}

/** The Security default data view patterns (`securitySolution:defaultIndex`). */
const SECURITY_DATA_PATTERNS = [
  'apm-*-transaction*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'traces-apm*',
  'winlogbeat-*',
];
const SECURITY_ALERTS = ['.alerts-security.alerts-*'];
const ATTACK_DISCOVERY_ALERTS = [
  '.alerts-security.attack.discovery.alerts-*',
  '.adhoc.alerts-security.attack.discovery.alerts-*',
];
const PREVIEW_ALERTS = [
  '.preview.alerts-security.alerts-*',
  '.internal.preview.alerts-security.alerts-*',
];
/**
 * Backing indices of the alert aliases above. Update-by-query writes to the concrete backing
 * indices, so writes need these patterns too; the alias patterns only cover reads.
 */
const SECURITY_ALERTS_BACKING = ['.internal.alerts-security.alerts-*'];
const ATTACK_DISCOVERY_ALERTS_BACKING = [
  '.internal.alerts-security.attack.discovery.alerts-*',
  '.internal.adhoc.alerts-security.attack.discovery.alerts-*',
];
const WRITE_BY_QUERY = ['index', 'maintenance'];

const COMMON_FEATURES: Record<string, string[]> = {
  [ALERTZERO_FEATURE_ID]: ['all'],
  agentBuilder: ['read'],
  contextEngine: ['all'],
  proposals: ['all'],
  actions: ['read'],
};
const COMMON_INDICES: IndexPrivileges[] = [
  {
    names: ['ai-index-idx-security-investigations'],
    privileges: ['read', 'view_index_metadata', 'index', 'auto_configure'],
  },
  // Agent Builder's own AI index. Agents describe AI indices as the worker, which reads their
  // mappings. Reads come from Elasticsearch's implicit, per-document filtered grant on Elastic AI
  // indices; an explicit `read` here would bypass that filter.
  {
    names: ['.ai-index-idx-elastic-index'],
    privileges: ['view_index_metadata'],
  },
];
const ENDPOINT_RESPONSE_ACTIONS = [
  'minimal_read',
  'host_isolation_all',
  'process_operations_all',
  'actions_log_management_read',
];

const buildRole = (
  workerName: string,
  features: Record<string, string[]>,
  indices: IndexPrivileges[]
): WorkerRolePayload => ({
  description: `Privileges for the AlertZero ${workerName} worker. Created by AlertZero.`,
  elasticsearch: {
    cluster: ['monitor_inference'],
    indices: [...COMMON_INDICES, ...indices],
    run_as: [],
  },
  kibana: [{ spaces: ['*'], base: [], feature: { ...COMMON_FEATURES, ...features } }],
});

/**
 * The prebuilt role and service account for each worker, covering the worker, its child workflows
 * and the actions it can auto-approve, in every space. Actions that always need a human
 * (`approvalPolicy: always-gate`) run as the approver, so their privileges are left out. Mirrors
 * "AlertZero prebuilt service accounts — Minimum privileges", including its conditional rows.
 */
export const WORKER_ROLE_DEFINITIONS: Readonly<Record<string, WorkerRoleDefinition>> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: {
    name: 'alertzero_alert_triage',
    role: buildRole(
      'Alert Triage',
      {
        securitySolutionRulesV4: ['minimal_read'],
        securitySolutionNotes: ['all'],
        securitySolutionAlertsV1: ['all'],
      },
      [
        { names: SECURITY_ALERTS, privileges: ['read', 'index', 'maintenance'] },
        { names: SECURITY_ALERTS_BACKING, privileges: WRITE_BY_QUERY },
      ]
    ),
  },
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: {
    name: 'alertzero_attack_discovery',
    role: buildRole(
      'Attack Discovery',
      {
        workflowsManagement: [
          'minimal_read',
          'workflow_read',
          'workflow_read_managed',
          'workflow_execution_read',
          'workflow_execution_read_managed',
          'workflow_execute',
        ],
        securitySolutionAttackDiscovery: ['all'],
        securitySolutionAlertsV1: ['all'],
      },
      [
        {
          names: ATTACK_DISCOVERY_ALERTS,
          privileges: ['read', 'view_index_metadata', 'index', 'maintenance'],
        },
        { names: ATTACK_DISCOVERY_ALERTS_BACKING, privileges: WRITE_BY_QUERY },
        { names: SECURITY_ALERTS, privileges: ['read', 'view_index_metadata'] },
        {
          names: ['.kibana-elastic-ai-assistant-anonymization-fields-*'],
          privileges: ['read'],
        },
        { names: ['logs-endpoint.events.*', 'entities-latest-*'], privileges: ['read'] },
        { names: SECURITY_DATA_PATTERNS, privileges: ['read'] },
      ]
    ),
  },
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: {
    name: 'alertzero_endpoint_analysis',
    role: buildRole('Endpoint analysis', { siemV5: ENDPOINT_RESPONSE_ACTIONS }, [
      { names: ATTACK_DISCOVERY_ALERTS, privileges: ['read'] },
      { names: SECURITY_ALERTS, privileges: ['read'] },
      {
        names: [
          'logs-endpoint.events.process-*',
          'logs-endpoint.events.network-*',
          'logs-endpoint.events.file-*',
          'logs-endpoint.events.registry-*',
        ],
        privileges: ['read', 'view_index_metadata'],
      },
    ]),
  },
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: {
    name: 'alertzero_threat_hunt',
    role: buildRole('Continuous Threat Hunt', { siemV5: ENDPOINT_RESPONSE_ACTIONS }, [
      { names: SECURITY_DATA_PATTERNS, privileges: ['read'] },
    ]),
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: {
    name: 'alertzero_rule_tuning',
    role: buildRole(
      'Rule Tuning',
      {
        workflowsManagement: ['read'],
        // Editing a rule and adding an exception are approver-run actions.
        securitySolutionRulesV4: ['read'],
        securitySolutionAlertsV1: ['all'],
      },
      [
        {
          names: SECURITY_ALERTS,
          privileges: ['read', 'index', 'maintenance', 'view_index_metadata'],
        },
        { names: SECURITY_ALERTS_BACKING, privileges: WRITE_BY_QUERY },
        { names: PREVIEW_ALERTS, privileges: ['read'] },
        { names: SECURITY_DATA_PATTERNS, privileges: ['read', 'view_index_metadata'] },
      ]
    ),
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: {
    name: 'alertzero_rule_coverage',
    role: buildRole(
      'Rule Coverage',
      {
        workflowsManagement: ['read'],
        // The rule-drafting tool checks rule-edit as the worker. Installing and enabling rules are
        // approver-run actions, so the endpoint exceptions grant they need is left out.
        securitySolutionRulesV4: ['all'],
        fleet: ['read'],
      },
      [
        { names: PREVIEW_ALERTS, privileges: ['read'] },
        { names: SECURITY_DATA_PATTERNS, privileges: ['read', 'view_index_metadata'] },
      ]
    ),
  },
};
