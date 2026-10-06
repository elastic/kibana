/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

export interface SourceEsqlResult {
  esql: string | undefined;
  /**
   * False only while the catalog lookup is in flight. A missing sources plugin, an unknown id,
   * or a failed request is resolved, and the chart falls back to the logs label.
   */
  isResolved: boolean;
}

/**
 * The ES|QL of one source, used to tell a metrics source from a logs source.
 * A missing source returns no query rather than failing the chart that asked.
 */
export const useSourceEsql = (sourceId: string | undefined): SourceEsqlResult => {
  const { nightshiftSources } = useKibana().services;
  const id = sourceId ?? '';
  const enabled = nightshiftSources !== undefined && id.length > 0;

  const { data, isSuccess, isError } = useQuery<string | undefined, Error>({
    queryKey: ['nightshift.sourceEsql', id],
    enabled,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!nightshiftSources) {
        return undefined;
      }
      try {
        const client = await nightshiftSources.getClient();
        const response = await client.fetch('GET /internal/nightshift/sources', {
          params: {
            query: { ids: [id], page: 1, per_page: 1 },
          },
          signal: signal ?? null,
        });
        return response.sources[0]?.esql;
      } catch {
        // The prefix is optional. A missing source or a down catalog still draws the chart as logs.
        return undefined;
      }
    },
  });

  return {
    esql: data,
    isResolved: !enabled || isSuccess || isError,
  };
};
