/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';
import {
  getEndpointSecurityPolicyManager,
  getEndpointSecurityPolicyManagerArtifactRole,
} from '../../../../../scripts/endpoint/common/roles_users';

const toKibanaRole = (
  role: ReturnType<typeof getEndpointSecurityPolicyManagerArtifactRole>
): KibanaRole => ({
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

export const getArtifactRole = (privilegePrefix: string, access: 'read' | 'none'): KibanaRole =>
  toKibanaRole(getEndpointSecurityPolicyManagerArtifactRole(privilegePrefix, access));

/** Policy manager with write on the artifact type but without `global_artifact_management_all`. */
export const getArtifactWriteRoleWithoutGlobalManagement = (
  privilegePrefix: string
): KibanaRole => {
  const role = toKibanaRole(getEndpointSecurityPolicyManager());
  const [entry] = role.kibana;
  const featureId =
    Object.keys(entry.feature).find((feature) => feature.startsWith('siem')) ?? SECURITY_FEATURE_ID;
  const siemPrivileges = entry.feature[featureId].filter(
    (privilege) =>
      privilege !== 'global_artifact_management_all' && privilege !== `${privilegePrefix}all`
  );

  return {
    ...role,
    kibana: [
      {
        ...entry,
        feature: { ...entry.feature, [featureId]: [...siemPrivileges, `${privilegePrefix}all`] },
      },
    ],
  };
};
