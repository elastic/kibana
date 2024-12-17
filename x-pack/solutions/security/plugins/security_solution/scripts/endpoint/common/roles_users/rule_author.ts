/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';
import { getNoResponseActionsRole } from './without_response_actions_role';

export const getRuleAuthor: () => Omit<Role, 'name'> = () => {
  const noResponseActionsRole = getNoResponseActionsRole();
  return {
    ...noResponseActionsRole,
    kibana: [
      {
        ...noResponseActionsRole.kibana[0],
        feature: {
          ...noResponseActionsRole.kibana[0].feature,
          siem: [
            'all',
            'read_alerts',
            'crud_alerts',
            'policy_management_all',
            'endpoint_list_all',
            'trusted_applications_all',
            'event_filters_all',
            'host_isolation_exceptions_read',
            'blocklist_all',
            'actions_log_management_read',
          ],
        },
      },
    ],
  };
};
