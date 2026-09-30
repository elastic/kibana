/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendLimitToQuery, getESQLResults } from '@kbn/esql-utils';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import { esqlResultToRows } from '../../../../../util/esql_result_to_rows';

// A preview only needs a sample; the default ES|QL limit would ship up to 1000 rows.
const PREVIEW_ROW_LIMIT = 100;

/** Sample rows of a source query over the app time range. Idle while the query is empty. */
export function useSourcePreview(esql: string) {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const {
    timeState: { start, end },
  } = useTimefilter();

  return useQuery({
    queryKey: ['sourcePreview', esql, start, end],
    queryFn: async ({ signal }) => {
      const { response } = await getESQLResults({
        esqlQuery: appendLimitToQuery(esql, PREVIEW_ROW_LIMIT),
        search: data.search.search,
        signal,
        dropNullColumns: true,
        filter: { range: { '@timestamp': { gte: start, lte: end, format: 'epoch_millis' } } },
      });
      return {
        columns: response.columns.map(({ name }) => name),
        rows: esqlResultToRows(response),
      };
    },
    enabled: esql.trim() !== '',
    retry: false,
    refetchOnWindowFocus: false,
  });
}
