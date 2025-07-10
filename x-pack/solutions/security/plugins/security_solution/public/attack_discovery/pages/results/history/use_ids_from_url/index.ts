/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { useSearchParams } from 'react-router-dom-v5-compat';

import { useCallback, useMemo } from 'react';

const schema = z.object({
  ids: z.string().array(),
});

export const useIdsFromUrl = (): { ids: string[]; setIdsUrl: (ids: string[]) => void } => {
  const [searchParams, setSearchParams] = useSearchParams();

  const ids = useMemo(() => {
    try {
      if (!searchParams.has('id')) {
        return [];
      }

      const parsed = schema.parse({
        ids: searchParams
          .getAll('id')
          .flatMap((id) => id.split(','))
          .map((id) => decodeURIComponent(id.trim())),
      });

      return parsed.ids;
    } catch (e) {
      return [];
    }
  }, [searchParams]);
  const setIdsUrl = useCallback(
    (newIds: string[]) => {
      if (newIds.length) {
        searchParams.set('id', newIds.join(','));
      } else {
        searchParams.delete('id');
      }
      setSearchParams(searchParams);
    },
    [searchParams, setSearchParams]
  );

  return { ids, setIdsUrl };
};
