/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import type { inputsModel, State } from '../../../../common/store';
import { createFilter } from '../../../../common/containers/helpers';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { hostsModel } from '../../store';
import { hostsSelectors } from '../../store';
import type {
  HostsEdges,
  PageInfoPaginated,
  CursorType,
} from '../../../../../common/search_strategy';
import type { ESTermQuery } from '../../../../../common/typed_json';
import type { HostEntity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';

import type { InspectResponse } from '../../../../types';
import { useEntitiesListQuery } from '../../../../entity_analytics/components/entity_store/hooks/use_entities_list_query';

export const ID = 'hostsAllQuery';

type LoadPage = (newActivePage: number) => void;
export interface HostsArgs {
  endDate: string;
  hosts: HostsEdges[];
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: LoadPage;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  startDate: string;
  totalCount: number;
}

interface UseAllHost {
  endDate: string;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
  startDate: string;
  type: hostsModel.HostsType;
}

/**
 * Maps Entity Store HostEntity to HostsEdges format
 */
const mapEntityToHostsEdge = (entity: HostEntity, index: number): HostsEdges => {
  const hostId = entity.entity?.id || entity.host?.id?.[0] || '';

  return {
    node: {
      _id: hostId,
      host: {
        id: entity.host?.id,
        name: entity.host?.name ? [entity.host.name] : undefined,
        ip: entity.host?.ip,
        type: entity.host?.type,
        mac: entity.host?.mac,
        architecture: entity.host?.architecture,
      },
      risk: entity.entity?.risk?.calculated_level,
      criticality: entity.asset?.criticality,
      lastSeen: entity.entity?.lifecycle?.last_activity
        ? [entity.entity.lifecycle.last_activity]
        : undefined,
    },
    cursor: {
      value: hostId || String(index),
      tiebreaker: null,
    } as CursorType,
  };
};

export const useAllHost = ({
  endDate,
  filterQuery,
  skip = false,
  startDate,
  type,
}: UseAllHost): [boolean, HostsArgs] => {
  const getHostsSelector = useMemo(() => hostsSelectors.hostsSelector(), []);
  const { activePage, direction, limit, sortField } = useDeepEqualSelector((state: State) =>
    getHostsSelector(state, type)
  );

  // Map sort field to Entity Store format if needed
  const entitySortField = useMemo(() => {
    // Map common host sort fields to entity store fields
    const fieldMap: Record<string, string> = {
      'host.name': 'host.name',
      'host.ip': 'host.ip',
      '@timestamp': '@timestamp',
    };
    return fieldMap[sortField] || sortField;
  }, [sortField]);

  // Convert filter query to Entity Store format
  const entityFilterQuery = useMemo(() => {
    const filter = createFilter(filterQuery);
    if (!filter) {
      return undefined;
    }
    return JSON.stringify(filter);
  }, [filterQuery]);

  const wrappedLoadMore = useCallback((newActivePage: number) => {
    // Entity Store query will be refetched with new page via activePage dependency
    // This callback is kept for API compatibility
  }, []);

  const { data, isLoading, refetch } = useEntitiesListQuery({
    entityTypes: ['host'],
    page: activePage + 1, // Entity Store uses 1-based pagination
    perPage: limit,
    sortField: entitySortField,
    sortOrder: direction,
    filterQuery: entityFilterQuery,
    skip,
  });

  // Map Entity Store response to HostsArgs format
  const hostsResponse = useMemo(() => {
    const edges: HostsEdges[] = (data?.records || [])
      .filter((entity): entity is HostEntity => 'host' in entity)
      .map((entity, index) => mapEntityToHostsEdge(entity, index));

    const totalCount = data?.total ?? 0;
    const currentPage = data?.page ?? 1;
    const perPage = data?.per_page ?? limit;
    const totalPages = Math.ceil(totalCount / perPage);

    const pageInfo: PageInfoPaginated = {
      activePage: currentPage - 1, // Convert back to 0-based
      fakeTotalCount: totalCount,
      showMorePagesIndicator: currentPage < totalPages,
    };

    const inspect: InspectResponse = data?.inspect
      ? {
          dsl: data.inspect.dsl || [],
          response: data.inspect.response || [],
        }
      : {
          dsl: [],
          response: [],
        };

    return {
      endDate,
      hosts: edges,
      id: ID,
      inspect,
      isInspected: false,
      loadPage: wrappedLoadMore,
      pageInfo,
      refetch: refetch as inputsModel.Refetch,
      startDate,
      totalCount,
    };
  }, [data, endDate, limit, startDate, wrappedLoadMore, refetch]);

  return [isLoading, hostsResponse];
};
