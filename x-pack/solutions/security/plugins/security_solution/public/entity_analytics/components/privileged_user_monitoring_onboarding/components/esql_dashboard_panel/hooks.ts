/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLResults, getIndexPatternFromESQLQuery, prettifyQuery } from '@kbn/esql-utils';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';

import { isLeft } from 'fp-ts/Either';
import { useEsqlGlobalFilterQuery } from '../../../../../common/hooks/esql/use_esql_global_filter';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../../common/components/page/manage_query';
import { esqlResponseToRecords } from '../../../../../common/utils/esql';
import { useKibana } from '../../../../../common/lib/kibana';
import type { EsqlQueryOrInvalidFields } from '../../../privileged_user_monitoring/queries/helpers';

export const DASHBOARD_TABLE_QUERY_ID = 'privmonDashboardTableQueryId';

export const useDashboardTableQuery = <TableItemType extends Record<string, string>>(
  tableQuery: EsqlQueryOrInvalidFields
) => {
  const filterQuery = useEsqlGlobalFilterQuery();
  const { data } = useKibana().services;

  const {
    isInitialLoading,
    isLoading,
    isError,
    isRefetching,
    refetch,
    data: result,
    error,
  } = useQuery(
    [tableQuery, filterQuery],
    async ({ signal }) => {
      if (isLeft(tableQuery)) {
        return null;
      }

      return getESQLResults({
        esqlQuery: tableQuery.right,
        search: data.search.search,
        signal,
        filter: filterQuery,
      });
    },
    {
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    }
  );

  const { deleteQuery, setQuery } = useGlobalTime();

  const response = result?.response;

  const inspect = useMemo(() => {
    if (isLeft(tableQuery)) {
      return {
        dsl: [],
        response: [],
      };
    }
    const index = getIndexPatternFromESQLQuery(tableQuery.right);
    return {
      dsl: [JSON.stringify({ index: [index], body: prettifyQuery(tableQuery.right) }, null, 2)],
      response: response ? [JSON.stringify(response, null, 2)] : [],
    };
  }, [tableQuery, response]);

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId: DASHBOARD_TABLE_QUERY_ID,
    loading: isLoading,
  });

  const records = esqlResponseToRecords<TableItemType>(response);

  return { records, isLoading, refetch, inspect, isError, error, isInitialLoading, isRefetching };
};
