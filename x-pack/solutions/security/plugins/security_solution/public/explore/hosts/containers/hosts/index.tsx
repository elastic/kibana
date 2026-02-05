/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import type { inputsModel, State } from '../../../../common/store';
import { createFilter } from '../../../../common/containers/helpers';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { hostsModel } from '../../store';
import { hostsActions, hostsSelectors } from '../../store';
import type { HostsEdges, PageInfoPaginated } from '../../../../../common/search_strategy';
import type { ESTermQuery } from '../../../../../common/typed_json';
import type { HostEntity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type { HostItem } from '../../../../../common/search_strategy/security_solution/hosts/common';
import { HostsFields } from '../../../../../common/api/search_strategy/hosts/model/sort';
import { HostsTableType } from '../../store/model';

import type { InspectResponse } from '../../../../types';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
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
 * Maps Entity Store HostEntity.host to HostEcs (HostItem.host uses HostEcs with array fields).
 */
const mapEntityHostToHostEcs = (host: HostEntity['host']) =>
  host
    ? {
        name: [host.name],
        id: host.id,
        ip: host.ip,
        mac: host.mac,
        architecture: host.architecture,
        ...(host.hostname?.length && { hostname: host.hostname }),
        ...(host.domain?.length && { domain: host.domain }),
        ...(host.type?.length && { type: host.type }),
      }
    : undefined;

/**
 * Maps Entity Store HostEntity to HostsEdges (node: HostItem, cursor)
 */
const mapEntityToHostsEdge = (entity: HostEntity): HostsEdges => {
  const lastSeen = entity.entity?.lifecycle?.last_activity ?? entity['@timestamp'] ?? '';
  const node: HostItem = {
    host: mapEntityHostToHostEcs(entity.host),
    lastSeen: Array.isArray(lastSeen) ? lastSeen : [lastSeen],
    risk: entity.entity?.risk?.calculated_level,
    criticality: entity.asset?.criticality,
  };
  const cursorValue = entity.entity?.id ?? entity.host?.entity?.id ?? entity.host?.id?.[0] ?? '';
  return { node, cursor: { value: cursorValue, tiebreaker: null } };
};

const ENTITY_STORE_HOST_INDEX_PATTERN_V2 = (namespace: string) =>
  `.entities.v2.latest.security_host_${namespace}`;

export const useAllHost = ({
  endDate,
  filterQuery,
  skip = false,
  startDate,
  type,
}: UseAllHost): [boolean, HostsArgs] => {
  const dispatch = useDispatch();
  const spaceId = useSpaceId();
  const getHostsSelector = useMemo(() => hostsSelectors.hostsSelector(), []);
  const { activePage, direction, limit, sortField } = useDeepEqualSelector((state: State) =>
    getHostsSelector(state, type)
  );

  // Map sort field to Entity Store format
  const entitySortField = useMemo(() => {
    const fieldMap: Record<string, string> = {
      [HostsFields.hostName]: 'host.name',
      [HostsFields.lastSeen]: '@timestamp',
      'host.name': 'host.name',
      '@timestamp': '@timestamp',
    };
    return fieldMap[sortField] ?? sortField;
  }, [sortField]);

  const entityFilterQuery = useMemo(() => {
    const filter = createFilter(filterQuery);
    if (!filter || filter === '{}' || filter === '""') {
      return undefined;
    }
    return filter;
  }, [filterQuery]);

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      dispatch(
        hostsActions.updateTableActivePage({
          activePage: newActivePage,
          hostsType: type,
          tableType: HostsTableType.hosts,
        })
      );
    },
    [dispatch, type]
  );

  const { data, isLoading, refetch } = useEntitiesListQuery({
    entityTypes: ['host'],
    page: activePage + 1,
    perPage: limit,
    sortField: entitySortField,
    sortOrder: direction,
    filterQuery: entityFilterQuery,
    skip,
  });

  const hostsResponse = useMemo(() => {
    const hosts: HostsEdges[] = (data?.records ?? [])
      .filter((entity): entity is HostEntity => 'host' in entity)
      .map(mapEntityToHostsEdge);

    const totalCount = data?.total ?? 0;
    const currentPage = data?.page ?? 1;
    const perPage = data?.per_page ?? limit;
    const totalPages = Math.ceil(totalCount / perPage);

    const pageInfo: PageInfoPaginated = {
      activePage: currentPage - 1,
      fakeTotalCount: totalCount,
      showMorePagesIndicator: currentPage < totalPages,
    };

    const namespace = spaceId ?? 'default';
    const inspect: InspectResponse = data?.inspect
      ? {
          dsl: data.inspect.dsl ?? [],
          response: data.inspect.response ?? [],
          indexPattern: [ENTITY_STORE_HOST_INDEX_PATTERN_V2(namespace)],
        }
      : { dsl: [], response: [], indexPattern: [ENTITY_STORE_HOST_INDEX_PATTERN_V2(namespace)] };

    return {
      endDate,
      hosts,
      id: ID,
      inspect,
      isInspected: false,
      loadPage: wrappedLoadMore,
      pageInfo,
      refetch: refetch as inputsModel.Refetch,
      startDate,
      totalCount,
    };
  }, [data, endDate, limit, spaceId, startDate, wrappedLoadMore, refetch]);

  return [isLoading, hostsResponse];
};
