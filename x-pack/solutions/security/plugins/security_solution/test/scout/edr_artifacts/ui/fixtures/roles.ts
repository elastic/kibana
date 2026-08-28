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

const siemFeatureId = (role: ReturnType<typeof getEndpointSecurityPolicyManager>): string =>
  Object.keys(role.kibana[0].feature).find((feature) => feature.startsWith('siem')) ??
  SECURITY_FEATURE_ID;

export const getArtifactReadRole = (privilegePrefix: string): KibanaRole => {
  const baseRole = getEndpointSecurityPolicyManager();
  const featureId = siemFeatureId(baseRole);
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
          [featureId]: [...siemPrivileges, `${privilegePrefix}read`],
        },
      },
    ],
  });
};

export const getArtifactNoneRole = (privilegePrefix: string): KibanaRole => {
  const baseRole = getEndpointSecurityPolicyManager();
  const featureId = siemFeatureId(baseRole);
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
          [featureId]: siemPrivileges,
        },
      },
    ],
  });
};
