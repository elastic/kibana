/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';
import { getNoResponseActionsRole } from './without_response_actions_role';

export const getSocManager: () => Omit<Role, 'name'> = () => {
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

            'policy_management_all',

            'global_artifact_management_all',
            'trusted_applications_all',
            'trusted_devices_all',
            'event_filters_all',
            'host_isolation_exceptions_all',
            'blocklist_all',
            'endpoint_exceptions_all',

            'host_isolation_all',
            'process_operations_all',
            'actions_log_management_all',

            'workflow_insights_all',
            'soc_management_all',
          ],
          securitySolutionRulesV2: ['all'],
          securitySolutionTimeline: ['all'],
          securitySolutionNotes: ['all'],
        },
      },
    ],
  };
};
