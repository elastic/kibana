/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';
import { getNoResponseActionsRole } from './without_response_actions_role';
import { SECURITY_FEATURE_ID } from '../../../../common/constants';

export const getWithResponseActionsRole: () => Omit<Role, 'name'> = () => {
  const noResponseActionsRole = getNoResponseActionsRole();
  return {
    ...noResponseActionsRole,
    kibana: [
      {
        ...noResponseActionsRole.kibana[0],
        feature: {
          ...noResponseActionsRole.kibana[0].feature,
          [SECURITY_FEATURE_ID]: [
            ...noResponseActionsRole.kibana[0].feature[SECURITY_FEATURE_ID],
            'file_operations_all',
            'execute_operations_all',
            'scan_operations_all',
            'host_isolation_all',
            'process_operations_all',
            'actions_log_management_all',
            'actions_log_management_read',
          ],
          securitySolutionTimeline: ['all'],
          securitySolutionNotes: ['all'],
        },
      },
    ],
  };
};
