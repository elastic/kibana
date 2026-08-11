/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  CheckPrivilegesPayload,
  CheckPrivilegesResponse,
  SecurityPluginStart,
} from '@kbn/security-plugin/server';
import type { EntityAnalyticsPrivileges } from '../../../../common/api/entity_analytics';

const groupPrivilegesByName = <PrivilegeName extends string>(
  privileges: Array<{
    privilege: PrivilegeName;
    authorized: boolean;
  }>
): Record<PrivilegeName, boolean> => {
  return privileges.reduce<Record<string, boolean>>((acc, { privilege, authorized }) => {
    acc[privilege] = authorized;
    return acc;
  }, {});
};

export const _formatPrivileges = (
  privileges: CheckPrivilegesResponse['privileges']
): EntityAnalyticsPrivileges['privileges'] => {
  const clusterPrivilegesByPrivilege = groupPrivilegesByName(privileges.elasticsearch.cluster);
  const kibanaPrivilegesByPrivilege = groupPrivilegesByName(privileges.kibana);

  const indexPrivilegesByIndex = Object.entries(privileges.elasticsearch.index).reduce<
    Record<string, Record<string, boolean>>
  >((acc, [index, indexPrivileges]) => {
    acc[index] = groupPrivilegesByName(indexPrivileges);
    return acc;
  }, {});

  return {
    elasticsearch: {
      ...(Object.keys(indexPrivilegesByIndex).length > 0
        ? {
            index: indexPrivilegesByIndex,
          }
        : {}),
      ...(Object.keys(clusterPrivilegesByPrivilege).length > 0
        ? {
            cluster: clusterPrivilegesByPrivilege,
          }
        : {}),
    },
    kibana: {
      ...(Object.keys(kibanaPrivilegesByPrivilege).length > 0 ? kibanaPrivilegesByPrivilege : {}),
    },
  };
};

interface CheckAndFormatPrivilegesOpts {
  request: KibanaRequest;
  security: SecurityPluginStart;
  privilegesToCheck: CheckPrivilegesPayload;
}

export async function checkAndFormatPrivileges({
  request,
  security,
  privilegesToCheck,
}: CheckAndFormatPrivilegesOpts): Promise<EntityAnalyticsPrivileges> {
  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  const { privileges, hasAllRequested } = await checkPrivileges(privilegesToCheck);

  // Derive read/write from the indices that were actually requested. Previously this always
  // checked asset-criticality only, which made Entity Store privilege checks report
  // has_read_permissions: false even for admins (that index was never in the request).
  const requestedIndexPatterns = Object.keys(privilegesToCheck.elasticsearch?.index ?? {});

  return {
    privileges: _formatPrivileges(privileges),
    has_all_required: hasAllRequested,
    ...hasReadWritePermissions(privileges.elasticsearch, requestedIndexPatterns),
  };
}

export const hasReadWritePermissions = (
  { index, cluster }: CheckPrivilegesResponse['privileges']['elasticsearch'],
  indexKeys: string | string[] = []
) => {
  const keys = (Array.isArray(indexKeys) ? indexKeys : [indexKeys]).filter(Boolean);
  const has =
    (type: string) =>
    ({ privilege, authorized }: { privilege: string; authorized: boolean }) =>
      privilege === type && authorized;
  const hasOnIndices = (type: string) => {
    if (keys.length > 0) {
      return keys.every((key) => index[key]?.some(has(type)));
    }
    return Object.values(index).some((privs) => privs?.some(has(type)));
  };
  return {
    has_read_permissions: hasOnIndices('read') || cluster.some(has('read')),
    has_write_permissions: hasOnIndices('write') || cluster.some(has('write')),
  };
};
