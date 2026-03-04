/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import { euid } from '@kbn/entity-store/common';
import type {
  HostEntity,
  UserEntity,
  ServiceEntity,
} from '../../../../../common/api/entity_analytics';
import type { HostItem, UserItem } from '../../../../../common/search_strategy';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';

const ENTITY_FROM_STORE_QUERY_KEY = 'ENTITY_FROM_STORE';

const getStableEntityIdentifiersKey = (identifiers: Record<string, string>): string =>
  JSON.stringify(
    Object.fromEntries(Object.entries(identifiers).sort(([a], [b]) => a.localeCompare(b)))
  );

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
  entityIdentifiers: Record<string, string>;
  entityType: 'host' | 'user';
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
  const { entityIdentifiers, entityType, skip } = params;
  const { fetchEntitiesList } = useEntityAnalyticsRoutes();

  const hasValidIdentifiers = Object.keys(entityIdentifiers).length > 0;
  const filter = euid.getEuidDslFilterBasedOnDocument(entityType, entityIdentifiers);

  const stableIdentifiersKey = getStableEntityIdentifiersKey(entityIdentifiers);
  const queryResult = useQuery({
    queryKey: [ENTITY_FROM_STORE_QUERY_KEY, entityType, stableIdentifiersKey, skip],
    queryFn: async () => {
      const response = await fetchEntitiesList({
        params: {
          entityTypes: [entityType],
          filterQuery: filter ? JSON.stringify(filter) : undefined,
          page: 1,
          perPage: 1,
        },
      });
      return response;
    },
    enabled: !skip && hasValidIdentifiers && !!filter,
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
