/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useGenerateUpdatedKueryString } from '../../../../hooks';
import { fetchSnapshotCount } from '../../../../state/api';

export const useSnapShotCount = ({ query, filters }: { query: string; filters?: [] | string }) => {
  const parsedFilters =
    filters === undefined || typeof filters === 'string'
      ? ''
      : JSON.stringify(Array.from(Object.entries(filters)));

  const [esKuery, error] = useGenerateUpdatedKueryString(query, parsedFilters, undefined, true);

  const { data, loading } = useFetcher(
    () =>
      fetchSnapshotCount({
        dateRangeStart: 'now-24h',
        dateRangeEnd: 'now',
        filters: error ? undefined : esKuery,
      }),
    // FIXME: Dario thinks there is a better way to do this but
    // he's getting tired and maybe the Uptime folks can fix it

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [esKuery, query]
  );

  return { count: data || { total: 0, up: 0, down: 0 }, loading };
};
