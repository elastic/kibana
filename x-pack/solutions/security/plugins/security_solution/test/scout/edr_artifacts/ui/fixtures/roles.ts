/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';
import { getEndpointSecurityPolicyManager } from '../../../../../scripts/endpoint/common/roles_users';

const toKibanaRole = (role: ReturnType<typeof getEndpointSecurityPolicyManager>): KibanaRole => ({
  elasticsearch: {
    cluster: [...(role.elasticsearch.cluster ?? [])],
    indices: role.elasticsearch.indices?.map((index) => ({
      names: [...index.names],
      privileges: [...index.privileges],
    })),
  },
  kibana: role.kibana.map((entry) => ({
    base: [...entry.base],
    feature: Object.fromEntries(
      Object.entries(entry.feature).map(([key, privileges]) => [key, [...privileges]])
    ),
    spaces: [...entry.spaces],
  })),
});

export const getArtifactRole = (privilegePrefix: string, access: 'read' | 'none'): KibanaRole => {
  const baseRole = getEndpointSecurityPolicyManager();
  const featureId =
    Object.keys(baseRole.kibana[0].feature).find((feature) => feature.startsWith('siem')) ??
    SECURITY_FEATURE_ID;
  const siemPrivileges = baseRole.kibana[0].feature[featureId].filter(
    (privilege) => privilege !== `${privilegePrefix}all`
  );

  return toKibanaRole({
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
  });
};
