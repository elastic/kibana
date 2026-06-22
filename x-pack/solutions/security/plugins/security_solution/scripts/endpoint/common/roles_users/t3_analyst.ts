/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';
import { getNoResponseActionsRole } from './without_response_actions_role';

export const getT3Analyst: () => Omit<Role, 'name'> = () => {
  const noResponseActionsRole = getNoResponseActionsRole();
  return {
    ...noResponseActionsRole,
    kibana: [
      {
        ...noResponseActionsRole.kibana[0],
        feature: {
          ...noResponseActionsRole.kibana[0].feature,
          siemV5: [
            'all',
            'endpoint_list_all',
            'global_artifact_management_all',
            'trusted_applications_all',
            'trusted_devices_all',
            'event_filters_all',
            'host_isolation_exceptions_all',
            'blocklist_all',
            'endpoint_exceptions_all',
            'policy_management_read',
            'host_isolation_all',
            'process_operations_all',
            'actions_log_management_all',
            'file_operations_all',
            'scan_operations_all',
            'workflow_insights_all',
          ],
          securitySolutionRulesV4: [
            'minimal_all',
            'security_solution_exceptions_all',
            'security_solution_investigation_guide_edit',
            'security_solution_custom_highlighted_fields_edit',
            'security_solution_enable_disable_rules',
            'security_solution_manual_run_rules',
          ],
          securitySolutionAlertsV1: ['all'],
          securitySolutionTimeline: ['all'],
          securitySolutionNotes: ['all'],
        },
      },
    ],
  };
};
