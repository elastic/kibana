/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import type { EntityType } from '@kbn/entity-store/public';
import {
  FF_ENABLE_ENTITY_STORE_V2,
  searchEntitiesFromEntityStore,
  useEntityStoreEuidApi,
} from '@kbn/entity-store/public';
import type {
  HostEntity,
  UserEntity,
  ServiceEntity,
} from '../../../../../common/api/entity_analytics';
import type { HostItem, UserItem } from '../../../../../common/search_strategy';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';
import { useKibana, useUiSetting } from '../../../../common/lib/kibana';

const ENTITY_FROM_STORE_QUERY_KEY = 'ENTITY_FROM_STORE';

const entityIdFilter = (id: string) =>
  JSON.stringify({
    bool: { filter: [{ term: { 'entity.id': id } }] },
  });

function serializeIdentityFieldsForQueryKey(
  fields: Record<string, string> | null | undefined
): string {
  if (fields == null || Object.keys(fields).length === 0) {
    return '';
  }
  const sortedKeys = Object.keys(fields).sort();
  return JSON.stringify(
    sortedKeys.reduce<Record<string, string>>((acc, key) => {
      acc[key] = fields[key];
      return acc;
    }, {})
  );
}

export function mapHostEntityToHostItem(entity: HostEntity): HostItem {
  const hostData = entity.host;
  if (!hostData) {
    return {};
  }
  return {
    host: {
      name: hostData.name ? [hostData.name] : undefined,
      id: hostData.id,
      ip: hostData.ip,
      mac: hostData.mac,
      architecture: hostData.architecture,
      type: hostData.type,
    },
  };
}

export function mapUserEntityToUserItem(entity: UserEntity): UserItem {
  const userData = entity.user;
  if (!userData) {
    return {};
  }
  return {
    user: {
      name: userData.name ? [userData.name] : undefined,
      id: userData.id,
      domain: userData.domain,
      full_name: userData.full_name,
      email: userData.email,
      hash: userData.hash,
    },
  };
}

export interface UseEntityFromStoreParams {
  /**
   * Canonical entity store v2 id (`entity.id` on unified latest index). When set, the hook queries by this id.
   */
  entityId?: string;
  /**
   * When `entityId` is not set, identity field–value pairs for legacy EUID / v1 resolution (e.g. `host.name`, `user.name`, `service.name`).
   */
  identityFields?: Record<string, string> | null;
  entityType?: string;
  skip: boolean;
}

export type EntityStoreRecord = HostEntity | UserEntity | ServiceEntity;

export interface EntityFromStoreResult<T> {
  entity: T | null;
  /** Raw entity store record (host/user/service) with risk and asset criticality. */
  entityRecord: EntityStoreRecord | null;
  firstSeen: string | null;
  lastSeen: string | null;
  isLoading: boolean;
  error: IHttpFetchError | null;
  inspect?: { dsl: string[]; response: string[] };
  refetch: () => void;
}

export function useEntityFromStore(
  params: UseEntityFromStoreParams
): EntityFromStoreResult<HostItem | UserItem> {
  const { entityId, identityFields, entityType, skip } = params;
  const euidApi = useEntityStoreEuidApi();
  const { fetchEntitiesList } = useEntityAnalyticsRoutes();
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);
  const {
    services: { http },
  } = useKibana();

  const identityDocument = useMemo(() => {
    if (identityFields == null || Object.keys(identityFields).length === 0) {
      return {};
    }
    return { ...identityFields };
  }, [identityFields]);

  const documentFilter = useMemo(
    () =>
      euidApi?.euid
        ? euidApi.euid.getEuidDslFilterBasedOnDocument(entityType as EntityType, identityDocument)
        : undefined,
    [euidApi?.euid, entityType, identityDocument]
  );

  const stableQueryKey = useMemo(
    () => entityId ?? serializeIdentityFieldsForQueryKey(identityFields),
    [entityId, identityFields]
  );

  const queryResult = useQuery({
    queryKey: [
      ENTITY_FROM_STORE_QUERY_KEY,
      entityType,
      stableQueryKey,
      skip,
      entityStoreV2Enabled,
      entityId ?? '',
    ],
    queryFn: async ({ signal }) => {
      if (entityStoreV2Enabled) {
        let filterQuery: string | undefined;
        if (entityId) {
          filterQuery = entityIdFilter(entityId);
        } else if (documentFilter) {
          filterQuery = JSON.stringify(documentFilter);
        }
        return searchEntitiesFromEntityStore(
          http,
          {
            entityTypes: [entityType as EntityType],
            filterQuery,
            page: 1,
            perPage: 1,
            sortField: '@timestamp',
            sortOrder: 'desc',
          },
          { signal }
        );
      }
      return fetchEntitiesList({
        signal,
        params: {
          entityTypes: [entityType as EntityType],
          filterQuery: documentFilter ? JSON.stringify(documentFilter) : undefined,
          page: 1,
          perPage: 1,
        },
      });
    },
    enabled: !skip && (Boolean(entityId) || Boolean(documentFilter)),
  });

  const { data, isLoading, error, refetch } = queryResult;
  const record = data?.records?.[0] as HostEntity | UserEntity | undefined;
  const entityField = record?.entity;

  const firstSeen = entityField?.lifecycle?.first_seen ?? null;
  const lastSeen = entityField?.lifecycle?.last_activity ?? null;

  let mappedDetails: HostItem | UserItem | null = null;
  if (record) {
    if (entityType === 'host' && 'host' in record) {
      mappedDetails = mapHostEntityToHostItem(record);
    } else if (entityType === 'user' && 'user' in record) {
      mappedDetails = mapUserEntityToUserItem(record);
    }
  }

  return {
    entity: mappedDetails,
    entityRecord: record ?? null,
    firstSeen,
    lastSeen,
    isLoading,
    error: error as IHttpFetchError | null,
    inspect: data?.inspect,
    refetch,
  };
}
