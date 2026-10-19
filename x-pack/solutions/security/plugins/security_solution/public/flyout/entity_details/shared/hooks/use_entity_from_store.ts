/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery, type QueryClient } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { EntityType, SearchEntitiesFromEntityStoreResponse } from '@kbn/entity-store/public';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import type {
  HostEntity,
  UserEntity,
  ServiceEntity,
} from '../../../../../common/api/entity_analytics';
import type { HostItem, UserItem } from '../../../../../common/search_strategy';
import {
  buildEntityIdFilter,
  RESOLVED_MODE_MAX_RECORDS,
} from '../../../../../common/entity_analytics/entity_store/resolution_group';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';
import type { EntityViewMode } from '../../../../../common/entity_analytics/entity_store/resolution_group';

export const ENTITY_FROM_STORE_QUERY_KEY = 'ENTITY_FROM_STORE';

/**
 * After a successful entity-store upsert, search can still return the previous document briefly
 * (Elasticsearch NRT / transform timing). Merge the saved record into the cache so the UI updates
 * immediately instead of refetch overwriting with stale data.
 */
export function applyEntityStoreSearchCachePatch(
  queryClient: QueryClient,
  entityType: 'user' | 'host' | 'service',
  updatedRecord: EntityStoreRecord
): void {
  const canonicalId = updatedRecord.entity?.id;
  if (!canonicalId) {
    return;
  }

  queryClient.setQueriesData(
    {
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === ENTITY_FROM_STORE_QUERY_KEY &&
        query.queryKey[1] === entityType,
    },
    (previous: SearchEntitiesFromEntityStoreResponse | undefined) => {
      const matchIndex =
        previous?.records?.findIndex((record) => record?.entity?.id === canonicalId) ?? -1;
      if (!previous || matchIndex < 0) {
        return previous;
      }
      const records = [...previous.records];
      records[matchIndex] =
        updatedRecord as SearchEntitiesFromEntityStoreResponse['records'][number];
      return { ...previous, records };
    }
  );
}

export function serializeIdentityFieldsForQueryKey(
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
   * Canonical entity store id (`entity.id` on unified latest index). When set, the hook queries by this id.
   */
  entityId?: string;
  /**
   * `single` (default) loads the `entityId` record only; `resolved` also loads every record that
   * resolves to `entityId`. Only applies when `entityId` is set.
   */
  mode?: EntityViewMode;
  /**
   * When `entityId` is not set, identity field–value pairs for EUID resolution
   * (e.g. `host.name`, `user.name`, `service.name`).
   */
  identityFields?: Record<string, string> | null;
  entityType?: string;
  skip: boolean;
  executionContext?: KibanaExecutionContext;
}

export type EntityStoreRecord = HostEntity | UserEntity | ServiceEntity;

export interface EntityFromStoreResult<T> {
  entity: T | null;
  /**
   * Primary raw entity store record (host/user/service) with risk and asset criticality. When
   * `entityId` is set this is the record whose `entity.id` matches it exactly, or `null` if the
   * store returned no such record (aliases never stand in for the target). For identity-field
   * lookups it is the single matching record.
   */
  entityRecord: EntityStoreRecord | null;
  /**
   * In `resolved` mode, the other records that resolve to `entityId` (aliases), excluding
   * `entityRecord` itself. Always empty in `single` mode.
   */
  aliasRecords: EntityStoreRecord[];
  firstSeen: string | null;
  lastSeen: string | null;
  isLoading: boolean;
  /**
   * True only while an initial fetch is actually in flight (react-query v4 `isLoading && isFetching`).
   * Unlike `isLoading`, this is `false` for idle/disabled queries — in react-query v4 a disabled query
   * with no cached data reports `isLoading: true` indefinitely, so callers gating side effects on "still
   * resolving" must use this flag to avoid hanging forever.
   */
  isInitialLoading: boolean;
  error: IHttpFetchError | null;
  inspect?: { dsl: string[]; response: string[] };
  refetch: () => void;
}

export function useEntityFromStore(
  params: UseEntityFromStoreParams
): EntityFromStoreResult<HostItem | UserItem> {
  const { entityId, mode = 'single', identityFields, entityType, skip, executionContext } = params;
  const euidApi = useEntityStoreEuidApi();
  const { fetchEntitiesListV2 } = useEntityAnalyticsRoutes();

  const hasEntityId = Boolean(entityId);
  const isResolvedMode = hasEntityId && mode === 'resolved';

  const identityDocument = useMemo(() => {
    if (identityFields == null || Object.keys(identityFields).length === 0) {
      return {};
    }
    return { ...identityFields };
  }, [identityFields]);

  /**
   * Partial-identity lookup: unlike the default partition semantics used by extraction, the
   * stored entity carries the higher-ranked identity fields (e.g. `host.id`), so requiring their
   * absence would never match. See https://github.com/elastic/kibana/issues/278276.
   */
  const documentFilter = useMemo(
    () =>
      euidApi?.euid
        ? euidApi.euid.dsl.getEuidFilterBasedOnDocument(
            euidApi.getBuiltInEntityDefinition(entityType as EntityType),
            identityDocument,
            {
              excludeHigherRankedFields: false,
            }
          )
        : undefined,
    [euidApi, entityType, identityDocument]
  );

  /**
   * When EUID cannot build a DSL document from minimal identity (e.g. only `user.name` from the alerts
   * table), we still need a store query so the request completes and the UI can show "no entity" state.
   * Otherwise React Query stays in `status: 'loading'` while the query never runs (`enabled` false),
   * so `isLoading` never clears and flyouts skip the "no corresponding entity" callout.
   */
  const identityTermsFilter = useMemo(() => {
    const entries = Object.entries(identityDocument).filter(
      ([, value]) => value != null && String(value) !== ''
    );
    if (entries.length === 0) {
      return undefined;
    }
    return {
      bool: {
        filter: entries.map(([field, value]) => ({ term: { [field]: value } })),
      },
    };
  }, [identityDocument]);

  const storeFilter = documentFilter ?? identityTermsFilter;

  const entityStoreFilterKey = useMemo(() => {
    if (entityId) {
      return isResolvedMode ? `resolved:${entityId}` : `id:${entityId}`;
    }
    if (documentFilter) {
      return `euid:${JSON.stringify(documentFilter)}`;
    }
    if (identityTermsFilter) {
      return `terms:${JSON.stringify(identityTermsFilter)}`;
    }
    return '';
  }, [entityId, isResolvedMode, documentFilter, identityTermsFilter]);

  const stableQueryKey = useMemo(
    () => (entityId ? entityId : serializeIdentityFieldsForQueryKey(identityFields)),
    [entityId, identityFields]
  );

  const queryResult = useQuery({
    queryKey: [
      ENTITY_FROM_STORE_QUERY_KEY,
      entityType,
      stableQueryKey,
      entityStoreFilterKey,
      skip,
      entityId ?? '',
    ],
    queryFn: async ({ signal }) => {
      let filterQuery: string | undefined;
      if (entityId) {
        filterQuery = JSON.stringify(buildEntityIdFilter(entityId, mode));
      } else if (storeFilter) {
        filterQuery = JSON.stringify(storeFilter);
      }
      return fetchEntitiesListV2({
        signal,
        params: {
          entityTypes: [entityType as EntityType],
          filterQuery,
          page: 1,
          perPage: isResolvedMode ? RESOLVED_MODE_MAX_RECORDS : 1,
          sortField: '@timestamp',
          sortOrder: 'desc',
          // The AI summary is loaded separately from the metadata datastream via
          // useFetchPersistedAiSummary, not from the entity store record.
        },
        context: executionContext,
      });
    },
    enabled: !skip && (hasEntityId || Boolean(storeFilter)),
  });

  const { data, isLoading, isInitialLoading, error, refetch } = queryResult;
  const records = useMemo(() => (data?.records ?? []) as EntityStoreRecord[], [data?.records]);
  // With an `entityId`, only an exact `entity.id` match may be the primary record: in resolved mode
  // the response also carries aliases, and surfacing one of those as the target would attribute
  // the wrong entity. Without an `entityId` (identity-field lookup) the single hit is the record.
  const record = useMemo(
    () => (entityId ? records.find((r) => r.entity?.id === entityId) : records[0]),
    [records, entityId]
  );
  const aliasRecords = useMemo(
    () => (isResolvedMode ? records.filter((r) => r !== record) : []),
    [isResolvedMode, records, record]
  );
  const entityField = record?.entity;

  const firstSeen = entityField?.lifecycle?.first_seen ?? null;
  const lastSeen =
    entityField?.lifecycle?.last_activity ?? entityField?.lifecycle?.last_seen ?? null;

  const mappedDetails = useMemo((): HostItem | UserItem | null => {
    if (!record) {
      return null;
    }
    if (entityType === 'host' && 'host' in record) {
      return mapHostEntityToHostItem(record);
    }
    if (entityType === 'user' && 'user' in record) {
      return mapUserEntityToUserItem(record);
    }
    return null;
  }, [record, entityType]);

  return useMemo(
    () => ({
      entity: mappedDetails,
      entityRecord: record ?? null,
      aliasRecords,
      firstSeen,
      lastSeen,
      isLoading,
      isInitialLoading,
      error: error as IHttpFetchError | null,
      inspect: data?.inspect,
      refetch,
    }),
    [
      mappedDetails,
      record,
      aliasRecords,
      firstSeen,
      lastSeen,
      isLoading,
      isInitialLoading,
      error,
      data?.inspect,
      refetch,
    ]
  );
}
