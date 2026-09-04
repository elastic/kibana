/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';
import { SECURITY_FEATURE_ID } from '../../../../common/constants';
import { getNoResponseActionsRole } from './without_response_actions_role';

export const getEndpointSecurityPolicyManager: () => Omit<Role, 'name'> = () => {
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

            'workflow_insights_all',
          ],
          securitySolutionRulesV2: ['all'],
          securitySolutionTimeline: ['all'],
          securitySolutionNotes: ['all'],
        },
      },
    ],
  };
};

/** Policy manager with one artifact type set to read or removed. */
export const getEndpointSecurityPolicyManagerArtifactRole = (
  privilegePrefix: string,
  access: 'read' | 'none'
): Omit<Role, 'name'> => {
  const baseRole = getEndpointSecurityPolicyManager();
  const featureId =
    Object.keys(baseRole.kibana[0].feature).find((feature) => feature.startsWith('siem')) ??
    SECURITY_FEATURE_ID;
  const siemPrivileges = baseRole.kibana[0].feature[featureId].filter(
    (privilege) => privilege !== `${privilegePrefix}all`
  );

  return {
    ...baseRole,
    kibana: [
      {
        ...baseRole.kibana[0],
        feature: {
          ...baseRole.kibana[0].feature,
          [featureId]:
            access === 'read' ? [...siemPrivileges, `${privilegePrefix}read`] : siemPrivileges,
        },
      },
    ],
  };
};

export const getEndpointSecurityPolicyManagementReadRole: () => Omit<Role, 'name'> = () => {
  const noResponseActionsRole = getNoResponseActionsRole();
  return {
    ...noResponseActionsRole,
    kibana: [
      {
        ...noResponseActionsRole.kibana[0],
        feature: {
          ...noResponseActionsRole.kibana[0].feature,
          siemV5: ['all', 'policy_management_read'],
          securitySolutionTimeline: ['all'],
          securitySolutionNotes: ['all'],
        },
      },
    ],
  };
};
