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
import type { usersModel } from '../../store';
import { usersSelectors } from '../../store';
import type { PageInfoPaginated } from '../../../../../common/search_strategy';
import type { ESTermQuery } from '../../../../../common/typed_json';
import type { UserEntity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type { User } from '../../../../../common/search_strategy/security_solution/users/all';

import type { InspectResponse } from '../../../../types';
import { useEntitiesListQuery } from '../../../../entity_analytics/components/entity_store/hooks/use_entities_list_query';

export const ID = 'usersAllQuery';

export interface UsersArgs {
  endDate: string;
  users: User[];
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  startDate: string;
  totalCount: number;
}

interface UseAllUser {
  endDate: string;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
  startDate: string;
  type: usersModel.UsersType;
}

/**
 * Maps Entity Store UserEntity to User format
 */
const mapEntityToUser = (entity: UserEntity): User => {
  const userName = entity.user?.name || '';
  const lastSeen = entity.entity?.lifecycle?.last_activity || entity['@timestamp'] || '';
  const domain = entity.user?.domain?.[0] || '';
  const risk = entity.entity?.risk?.calculated_level;
  const criticality = entity.asset?.criticality;

  return {
    name: userName,
    lastSeen,
    domain,
    risk,
    criticality,
  };
};

export const useAllUser = ({
  endDate,
  filterQuery,
  skip = false,
  startDate,
  type,
}: UseAllUser): [boolean, UsersArgs] => {
  const getUsersSelector = useMemo(() => usersSelectors.allUsersSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getUsersSelector(state)
  );

  // Map sort field to Entity Store format if needed
  const entitySortField = useMemo(() => {
    // Map common user sort fields to entity store fields
    const fieldMap: Record<string, string> = {
      name: 'user.name',
      lastSeen: '@timestamp',
      'user.name': 'user.name',
      '@timestamp': '@timestamp',
    };
    return fieldMap[sort.field] || sort.field;
  }, [sort.field]);

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
    entityTypes: ['user'],
    page: activePage + 1, // Entity Store uses 1-based pagination
    perPage: limit,
    sortField: entitySortField,
    sortOrder: sort.direction,
    filterQuery: entityFilterQuery,
    skip,
  });

  // Map Entity Store response to UsersArgs format
  const usersResponse = useMemo(() => {
    const users: User[] = (data?.records || [])
      .filter((entity): entity is UserEntity => 'user' in entity)
      .map((entity) => mapEntityToUser(entity));

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
      users,
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

  return [isLoading, usersResponse];
};
