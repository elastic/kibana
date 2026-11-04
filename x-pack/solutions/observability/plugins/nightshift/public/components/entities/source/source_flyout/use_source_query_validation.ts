/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDebouncedValue } from '@kbn/react-hooks';
import { useQuery } from '@kbn/react-query';
import { getFormattedError } from '../../common/errors';
import { useKibana } from '../../hooks/use_kibana';
import { validateSourceEsql } from './validate_source_esql';

export const SOURCE_QUERY_VALIDATION_DEBOUNCE_MS = 500;

export type SourceQueryValidation =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'valid'; indexExists: boolean }
  | { status: 'invalid'; error: string };

/**
 * Validates a source query while it is edited, once typing pauses. The browser-side rules run
 * first; only a query that passes them is sent to the server, which also checks its fields and
 * reports whether any index exists yet behind it. `idle` while disabled or empty.
 */
export function useSourceQueryValidation({
  esql,
  enabled,
}: {
  esql: string;
  enabled: boolean;
}): SourceQueryValidation {
  const { nightshiftSources } = useKibana().services;
  const debouncedEsql = useDebouncedValue(esql, SOURCE_QUERY_VALIDATION_DEBOUNCE_MS);
  const isIdle = (query: string) => !enabled || query.trim() === '';
  const localCheck = isIdle(debouncedEsql) ? true : validateSourceEsql(debouncedEsql);

  const { data, error } = useQuery({
    queryKey: ['sourceQueryValidation', debouncedEsql],
    queryFn: async ({ signal }) => {
      const client = await nightshiftSources.getClient();
      return client.fetch('POST /internal/nightshift/sources/_validate', {
        params: { body: { esql: debouncedEsql } },
        signal: signal ?? null,
      });
    },
    enabled: !isIdle(debouncedEsql) && localCheck === true,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isIdle(esql)) {
    return { status: 'idle' };
  }
  if (debouncedEsql !== esql) {
    return { status: 'validating' };
  }
  if (localCheck !== true) {
    return { status: 'invalid', error: localCheck };
  }
  if (error) {
    return { status: 'invalid', error: getFormattedError(error).message };
  }
  if (!data) {
    return { status: 'validating' };
  }
  return data.valid
    ? { status: 'valid', indexExists: data.index_exists }
    : { status: 'invalid', error: data.error };
}
