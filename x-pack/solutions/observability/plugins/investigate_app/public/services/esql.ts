/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_SEARCH_STRATEGY, type DataView } from '@kbn/data-plugin/common';
import type { ESFilter, ESQLSearchResponse } from '@kbn/es-types';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { Suggestion } from '@kbn/lens-plugin/public';
import { lastValueFrom } from 'rxjs';
import { v4 } from 'uuid';
import type { InvestigateAppStartDependencies } from '../types';
import { getKibanaColumns } from '../utils/get_kibana_columns';

interface DefaultQueryParams {
  query: string;
  filter?: ESFilter;
  signal: AbortSignal;
}

export interface EsqlColumnMeta {
  id: string;
  name: string;
  meta: { type: DatatableColumnType };
}

export interface EsqlQueryMeta {
  columns: EsqlColumnMeta[];
  suggestions: Array<Suggestion & { id: string }>;
  dataView: DataView;
}

export interface EsqlService {
  query: (params: DefaultQueryParams) => Promise<ESQLSearchResponse>;
  queryWithMeta: (
    params: DefaultQueryParams
  ) => Promise<{ query: ESQLSearchResponse; meta: EsqlQueryMeta }>;
  meta: (params: DefaultQueryParams) => Promise<EsqlQueryMeta>;
}

export function createEsqlService({
  data,
  dataViews,
  lens,
}: Pick<InvestigateAppStartDependencies, 'data' | 'dataViews' | 'lens'>): EsqlService {
  async function runQuery({
    query,
    signal,
    dropNullColumns = true,
    filter,
  }: {
    query: string;
    signal: AbortSignal;
    dropNullColumns?: boolean;
    filter?: ESFilter;
  }) {
    const response = await lastValueFrom(
      data.search.search(
        {
          params: {
            query,
            dropNullColumns,
            filter,
          },
        },
        { strategy: ESQL_SEARCH_STRATEGY, abortSignal: signal }
      )
    ).then((searchResponse) => {
      return searchResponse.rawResponse as unknown as ESQLSearchResponse;
    });

    return response;
  }

  const esql: EsqlService = {
    query: async ({ query, signal, filter }) => {
      return await runQuery({ query, signal, filter });
    },
    queryWithMeta: async ({ query, signal, filter }) => {
      const [meta, queryResult] = await Promise.all([
        esql.meta({ query, signal, filter }),
        esql.query({ query, signal, filter }),
      ]);

      return {
        query: queryResult,
        meta,
      };
    },
    meta: async ({ query, signal, filter }) => {
      const [response, lensHelper, dataView] = await Promise.all([
        runQuery({ query: `${query} | LIMIT 0`, signal, dropNullColumns: false, filter }),
        lens.stateHelperApi(),
        getESQLAdHocDataview(query, dataViews),
      ]);

      const columns = getKibanaColumns(response.columns ?? []);

      const suggestionsFromLensHelper = await lensHelper.suggestions(
        {
          dataViewSpec: dataView.toSpec(false),
          fieldName: '',
          textBasedColumns: columns,
          query: {
            esql: query,
          },
        },
        dataView
      );

      if (signal.aborted) {
        throw new AbortError();
      }

      return {
        columns,
        suggestions:
          suggestionsFromLensHelper?.map((suggestion) => ({ id: v4(), ...suggestion })) ?? [],
        dataView,
      };
    },
  };

  return esql;
}
