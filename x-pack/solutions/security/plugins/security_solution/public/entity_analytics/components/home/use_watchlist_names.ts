/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../common/lib/kibana';
import { WATCHLISTS_URL } from '../../../../common/entity_analytics/watchlists/constants';
import { API_VERSIONS } from '../../../../common/entity_analytics/constants';

export const useWatchlistNames = (): Map<string, string> => {
  const { http } = useKibana().services;
  const { data } = useQuery(['watchlist-names'], () =>
    http.get<Array<{ id?: string; name: string }>>(`${WATCHLISTS_URL}/list`, {
      version: API_VERSIONS.public.v1,
    })
  );
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const w of data ?? []) {
      if (w.id) map.set(w.id, w.name);
    }
    return map;
  }, [data]);
};
