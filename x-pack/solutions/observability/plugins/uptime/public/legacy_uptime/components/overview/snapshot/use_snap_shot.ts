/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { useSelector } from 'react-redux';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useGetUrlParams } from '../../../hooks';
import { esKuerySelector } from '../../../state/selectors';
import { UptimeRefreshContext } from '../../../contexts';
import { fetchSnapshotCount } from '../../../state/api';

export const useSnapShotCount = () => {
  const { dateRangeStart, dateRangeEnd, query } = useGetUrlParams();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const esKuery = useSelector(esKuerySelector);

  const { data, loading } = useFetcher(
    () => fetchSnapshotCount({ query, dateRangeStart, dateRangeEnd, filters: esKuery }),
    // FIXME: Dario thinks there is a better way to do this but
    // he's getting tired and maybe the Uptime folks can fix it

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateRangeStart, dateRangeEnd, esKuery, lastRefresh, query]
  );

  return { count: data || { total: 0, up: 0, down: 0 }, loading };
};
