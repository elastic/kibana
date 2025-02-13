/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { getOr } from 'lodash/fp';

import { NetworkHttpTable } from '../../components/network_http_table';
import { ID, useNetworkHttp } from '../../containers/network_http';
import { manageQuery } from '../../../../common/components/page/manage_query';

import type { HttpQueryTabBodyProps } from './types';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

const NetworkHttpTableManage = manageQuery(NetworkHttpTable);

export const HttpQueryTabBody = ({
  endDate,
  filterQuery,
  indexNames,
  skip,
  startDate,
  setQuery,
  type,
}: HttpQueryTabBodyProps) => {
  const queryId = `${ID}-${type}`;
  const { toggleStatus } = useQueryToggle(queryId);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);
  const [
    loading,
    { id, inspect, isInspected, loadPage, networkHttp, pageInfo, refetch, totalCount },
  ] = useNetworkHttp({
    endDate,
    filterQuery,
    id: queryId,
    indexNames,
    skip: querySkip,
    startDate,
    type,
  });

  return (
    <NetworkHttpTableManage
      data={networkHttp}
      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      id={id}
      inspect={inspect}
      isInspect={isInspected}
      loading={loading}
      loadPage={loadPage}
      refetch={refetch}
      setQuery={setQuery}
      setQuerySkip={setQuerySkip}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      totalCount={totalCount}
      type={type}
    />
  );
};

HttpQueryTabBody.displayName = 'HttpQueryTabBody';
