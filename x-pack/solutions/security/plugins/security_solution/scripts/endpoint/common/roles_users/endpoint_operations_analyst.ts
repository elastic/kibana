/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';

export const getEndpointOperationsAnalyst: () => Omit<Role, 'name'> = () => {
  // IMPORTANT
  // This role is sync'ed with the role used for serverless and should not be changed
  // unless the role for serverless has also been changed.
  // This role is the default login for cypress tests as well (defend workloads team)
  return {
    elasticsearch: {
      cluster: [],
      indices: [
        {
          names: [
            'metrics-endpoint.metadata_current_*',
            '.fleet-agents*',
            '.fleet-actions*',
            'apm-*-transaction*',
            'traces-apm*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
            '.lists*',
            '.items*',
          ],
          privileges: ['read'],
        },
        {
          names: [
            '.alerts-security*',
            '.siem-signals-*',
            '.preview.alerts-security*',
            '.internal.preview.alerts-security*',
          ],
          privileges: ['read', 'write'],
        },
      ],
      run_as: [],
    },
    kibana: [
      {
        base: [],
        feature: {
          ml: ['read'],
          actions: ['all'],
          fleet: ['all'],
          fleetv2: ['all'],
          osquery: ['all'],
          securitySolutionCasesV3: ['all'],
          builtinAlerts: ['all'],
          siemV2: [
            'all',
            'read_alerts',
            'policy_management_all',
            'endpoint_list_all',
            'trusted_applications_all',
            'event_filters_all',
            'host_isolation_exceptions_all',
            'blocklist_all',
            'host_isolation_all',
            'process_operations_all',
            'actions_log_management_all',
            'file_operations_all',
            'execute_operations_all',
            'scan_operations_all',
            'workflow_insights_all',
          ],
          securitySolutionTimeline: ['all'],
          securitySolutionNotes: ['all'],
        },
        spaces: ['*'],
      },
    ],
  };
};
