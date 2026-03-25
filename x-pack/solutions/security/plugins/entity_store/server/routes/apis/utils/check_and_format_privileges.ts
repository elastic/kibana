/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core/server';
import type {
  CheckPrivilegesPayload,
  CheckPrivilegesResponse,
  SecurityPluginStart,
} from '@kbn/security-plugin/server';

export type Privileges = z.infer<typeof Privileges>;
export const Privileges = z.object({
  has_all_required: z.boolean(),
  has_read_permissions: z.boolean().optional(),
  has_write_permissions: z.boolean().optional(),
  privileges: z.object({
    elasticsearch: z.object({
      cluster: z.object({}).catchall(z.boolean()).optional(),
      index: z.object({}).catchall(z.object({}).catchall(z.boolean())).optional(),
    }),
    kibana: z.object({}).catchall(z.boolean()).optional(),
  }),
});

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

export const formatPrivileges = (
  privileges: CheckPrivilegesResponse['privileges']
): Privileges['privileges'] => {
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
  indexPattern: string;
  request: KibanaRequest;
  security: SecurityPluginStart;
  privilegesToCheck: CheckPrivilegesPayload;
}

export async function checkAndFormatPrivileges({
  request,
  security,
  privilegesToCheck,
  indexPattern,
}: CheckAndFormatPrivilegesOpts): Promise<Privileges> {
  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  const { privileges, hasAllRequested } = await checkPrivileges(privilegesToCheck);

  return {
    privileges: formatPrivileges(privileges),
    has_all_required: hasAllRequested,
    ...hasReadWritePermissions(privileges.elasticsearch, indexPattern),
  };
}

export const hasReadWritePermissions = (
  { index, cluster }: CheckPrivilegesResponse['privileges']['elasticsearch'],
  indexKey = ''
) => {
  const has =
    (type: string) =>
    ({ privilege, authorized }: { privilege: string; authorized: boolean }) =>
      privilege === type && authorized;
  return {
    has_read_permissions: index[indexKey]?.some(has('read')) || cluster.some(has('read')),

    has_write_permissions: index[indexKey]?.some(has('write')) || cluster.some(has('write')),
  };
};
