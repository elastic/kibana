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
import {
  getEntitiesAlias,
  getLatestEntityIndexPattern,
  getEntityMetadataAlias,
  getMetadataEntityIndexPattern,
  ENTITY_LATEST,
} from '../../../../common';

export type Privileges = z.infer<typeof Privileges>;
export const Privileges = z.object({
  has_all_required: z.boolean(),
  has_read_permissions: z.boolean().optional(),
  has_write_permissions: z.boolean().optional(),
  has_kibana_feature_access: z.boolean().optional(),
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
  indexPatterns: string[];
  request: KibanaRequest;
  security: SecurityPluginStart;
  privilegesToCheck: CheckPrivilegesPayload;
}

export async function checkAndFormatPrivileges({
  request,
  security,
  privilegesToCheck,
  indexPatterns,
}: CheckAndFormatPrivilegesOpts): Promise<Privileges> {
  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  const { privileges, hasAllRequested } = await checkPrivileges(privilegesToCheck);

  return {
    privileges: formatPrivileges(privileges),
    has_all_required: hasAllRequested,
    ...hasReadWritePermissions(privileges.elasticsearch, indexPatterns),
    ...(privilegesToCheck.kibana?.length
      ? { has_kibana_feature_access: privileges.kibana.every(({ authorized }) => authorized) }
      : {}),
  };
}

export interface CheckEntityStoreIndexPrivilegesOpts {
  request: KibanaRequest;
  security: SecurityPluginStart;
  spaceId: string;
  /**
   * Also checks read access to the metadata alias/index pattern, e.g. for the
   * `check_privileges` route, which needs to know whether the metadata indices are readable.
   */
  includeMetadataPrivileges?: boolean;
  /**
   * Also checks these Kibana feature privileges if specified (e.g. `['securitySolution',
   * 'securitySolution-entity-analytics']`. Needed by callers that run with a synthetic request
   * and so never pass through Kibana's route-level authorization
   */
  kibanaFeaturePrivileges?: string[];
}

/**
 * Shared write/read privilege check for the entities + latest entity indices, reused by the
 * `check_privileges` route, the `entityStore.updateAssetCriticality` workflow step, and the
 * Security Solution `set_asset_criticality` agent builder tool.
 */
export async function checkEntityStoreIndexPrivileges({
  request,
  security,
  spaceId,
  includeMetadataPrivileges = false,
  kibanaFeaturePrivileges,
}: CheckEntityStoreIndexPrivilegesOpts): Promise<Privileges> {
  const entitiesAliasPattern = getEntitiesAlias(ENTITY_LATEST, spaceId);
  const latestEntityIndexPattern = getLatestEntityIndexPattern(spaceId);

  const index: Record<string, string[]> = {
    [entitiesAliasPattern]: ['read', 'write'],
    [latestEntityIndexPattern]: ['read', 'write'],
  };

  if (includeMetadataPrivileges) {
    index[getEntityMetadataAlias(spaceId)] = ['read'];
    index[getMetadataEntityIndexPattern(spaceId)] = ['read'];
  }

  return checkAndFormatPrivileges({
    request,
    security,
    indexPatterns: [entitiesAliasPattern, latestEntityIndexPattern],
    privilegesToCheck: {
      elasticsearch: {
        cluster: [],
        index,
      },
      ...(kibanaFeaturePrivileges?.length
        ? {
            kibana: kibanaFeaturePrivileges.map((privilege) =>
              security.authz.actions.api.get(privilege)
            ),
          }
        : {}),
    },
  });
}

export const hasReadWritePermissions = (
  { index, cluster }: CheckPrivilegesResponse['privileges']['elasticsearch'],
  indexKeys: string[] = []
) => {
  const has =
    (type: string) =>
    ({ privilege, authorized }: { privilege: string; authorized: boolean }) =>
      privilege === type && authorized;
  const hasOnAllIndices = (type: string) =>
    indexKeys.length > 0 && indexKeys.every((key) => index[key]?.some(has(type)));
  return {
    has_read_permissions: hasOnAllIndices('read') || cluster.some(has('read')),
    has_write_permissions: hasOnAllIndices('write') || cluster.some(has('write')),
  };
};
