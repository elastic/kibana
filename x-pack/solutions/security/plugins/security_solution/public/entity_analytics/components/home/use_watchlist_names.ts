/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useGetWatchlists } from '../../api/hooks/use_get_watchlists';

export const useWatchlistNames = (): Map<string, string> => {
  const { data } = useGetWatchlists();
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const w of data ?? []) {
      if (w.id) map.set(w.id, w.name);
    }
    return map;
  }, [data]);
};
