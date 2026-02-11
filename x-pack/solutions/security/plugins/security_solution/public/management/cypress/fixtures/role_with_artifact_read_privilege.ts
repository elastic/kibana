/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_FEATURE_ID } from '../../../../common/constants';
import { getEndpointSecurityPolicyManager } from '../../../../scripts/endpoint/common/roles_users';

export const getRoleWithArtifactReadPrivilege = (privilegePrefix: string) => {
  const endpointSecurityPolicyManagerRole = getEndpointSecurityPolicyManager();

  const siemVersion =
    Object.keys(endpointSecurityPolicyManagerRole.kibana[0].feature).find((feature) =>
      feature.startsWith('siem')
    ) ?? SECURITY_FEATURE_ID;

  return {
    ...endpointSecurityPolicyManagerRole,
    kibana: [
      {
        ...endpointSecurityPolicyManagerRole.kibana[0],
        feature: {
          ...endpointSecurityPolicyManagerRole.kibana[0].feature,
          [siemVersion]: [
            ...endpointSecurityPolicyManagerRole.kibana[0].feature[siemVersion].filter(
              (privilege) => privilege !== `${privilegePrefix}all`
            ),
            `${privilegePrefix}read`,
          ],
        },
      },
    ],
  };
};
