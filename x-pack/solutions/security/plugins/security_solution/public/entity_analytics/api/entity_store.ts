/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { GetEntityStoreStatusResponse } from '../../../common/api/entity_analytics/entity_store/status.gen';
import type {
  InitEntityStoreRequestBodyInput,
  InitEntityStoreResponse,
} from '../../../common/api/entity_analytics/entity_store/enable.gen';
import type {
  DeleteEntityEngineResponse,
  EntityType,
  InitEntityEngineResponse,
  ListEntityEnginesResponse,
  StopEntityEngineResponse,
} from '../../../common/api/entity_analytics';
import type {
  ListFilterableEntitiesResponse,
  LinkEntitiesResponse,
  ListPrimaryEntitiesResponse,
  ListSecondaryEntitiesResponse,
} from '../../../common/api/entity_analytics/entity_store/resolution';
import { API_VERSIONS } from '../../../common/entity_analytics/constants';
import {
  LIST_FILTERABLE_ENTITIES_URL,
  LINK_ENTITIES_URL,
  LIST_PRIMARIES_URL,
  LIST_SECONDARIES_URL,
} from '../../../common/entity_analytics/entity_store/constants';
import { useKibana } from '../../common/lib/kibana/kibana_react';

export const useEntityStoreRoutes = () => {
  const http = useKibana().services.http;

  return useMemo(() => {
    const enableEntityStore = async (options: InitEntityStoreRequestBodyInput = {}) => {
      return http.fetch<InitEntityStoreResponse>('/api/entity_store/enable', {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify(options),
      });
    };

    const getEntityStoreStatus = async (withComponents = false) => {
      return http.fetch<GetEntityStoreStatusResponse>('/api/entity_store/status', {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: { include_components: withComponents },
      });
    };

    const initEntityEngine = async (entityType: EntityType) => {
      return http.fetch<InitEntityEngineResponse>(`/api/entity_store/engines/${entityType}/init`, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
      });
    };

    const stopEntityEngine = async (entityType: EntityType) => {
      return http.fetch<StopEntityEngineResponse>(`/api/entity_store/engines/${entityType}/stop`, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
      });
    };

    const deleteEntityEngine = async (entityType: EntityType, deleteData: boolean) => {
      return http.fetch<DeleteEntityEngineResponse>(`/api/entity_store/engines/${entityType}`, {
        method: 'DELETE',
        query: { data: deleteData },
        version: API_VERSIONS.public.v1,
      });
    };

    const listEntityEngines = async () => {
      return http.fetch<ListEntityEnginesResponse>(`/api/entity_store/engines`, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
      });
    };

    // Entity Resolution (FIELDS Architecture) endpoints
    const listFilterableEntities = async (params: {
      entityType: EntityType;
      excludeEntityId?: string;
      searchTerm?: string;
      limit?: number;
    }) => {
      const { entityType, excludeEntityId, searchTerm, limit } = params;
      const url = LIST_FILTERABLE_ENTITIES_URL.replace('{entityType}', entityType);
      return http.fetch<ListFilterableEntitiesResponse>(url, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: {
          ...(excludeEntityId && { exclude_entity_id: excludeEntityId }),
          ...(searchTerm && { search_term: searchTerm }),
          ...(limit && { limit }),
        },
      });
    };

    const linkEntities = async (params: {
      entityType: EntityType;
      primaryEntityId: string;
      secondaryEntityIds: string[];
    }) => {
      const { entityType, primaryEntityId, secondaryEntityIds } = params;
      const url = LINK_ENTITIES_URL.replace('{entityType}', entityType);
      return http.fetch<LinkEntitiesResponse>(url, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({
          primary_entity_id: primaryEntityId,
          secondary_entity_ids: secondaryEntityIds,
        }),
      });
    };

    const listPrimaryEntities = async (params: {
      entityType: EntityType;
      page?: number;
      perPage?: number;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
      filterQuery?: string;
    }) => {
      const { entityType, page, perPage, sortField, sortOrder, filterQuery } = params;
      const url = LIST_PRIMARIES_URL.replace('{entityType}', entityType);
      return http.fetch<ListPrimaryEntitiesResponse>(url, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: {
          ...(page && { page }),
          ...(perPage && { per_page: perPage }),
          ...(sortField && { sort_field: sortField }),
          ...(sortOrder && { sort_order: sortOrder }),
          ...(filterQuery && { filter_query: filterQuery }),
        },
      });
    };

    const listSecondaryEntities = async (params: {
      entityType: EntityType;
      primaryEntityId: string;
    }) => {
      const { entityType, primaryEntityId } = params;
      const url = LIST_SECONDARIES_URL.replace('{entityType}', entityType);
      return http.fetch<ListSecondaryEntitiesResponse>(url, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: {
          primary_entity_id: primaryEntityId,
        },
      });
    };

    return {
      enableEntityStore,
      getEntityStoreStatus,
      initEntityEngine,
      stopEntityEngine,
      deleteEntityEngine,
      listEntityEngines,
      // Entity Resolution
      listFilterableEntities,
      linkEntities,
      listPrimaryEntities,
      listSecondaryEntities,
    };
  }, [http]);
};
