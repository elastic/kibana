/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React, { useEffect, useMemo, useState } from 'react';

import type { UsersComponentsQueryProps } from './types';

import { manageQuery } from '../../../../common/components/page/manage_query';
import { UsersTable } from '../../components/all_users';
import { useAllUser, ID } from '../../containers/users';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { usersSelectors } from '../../store';

const UsersTableManage = manageQuery(UsersTable);

export const AllUsersQueryTabBody = ({
  endDate,
  filterQuery,
  indexNames,
  skip,
  setQuery,
  startDate,
  type,
  deleteQuery,
}: UsersComponentsQueryProps) => {
  const { toggleStatus } = useQueryToggle(ID);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);

  const [loading, { users, totalCount, pageInfo, loadPage, id, inspect, refetch }] = useAllUser({
    endDate,
    filterQuery,
    skip: querySkip,
    startDate,
    type,
  });

  const getUsersSelector = useMemo(() => usersSelectors.allUsersSelector(), []);
  const { sort } = useDeepEqualSelector((state) => getUsersSelector(state));

  return (
    <UsersTableManage
      users={users}
      deleteQuery={deleteQuery}
      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      id={id}
      inspect={inspect}
      loading={loading}
      loadPage={loadPage}
      refetch={refetch}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      setQuery={setQuery}
      totalCount={totalCount}
      type={type}
      sort={sort}
      setQuerySkip={setQuerySkip}
    />
  );
};

AllUsersQueryTabBody.displayName = 'AllUsersQueryTabBody';
