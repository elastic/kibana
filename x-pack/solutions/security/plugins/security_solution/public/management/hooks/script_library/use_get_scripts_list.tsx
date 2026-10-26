/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type {
  ScriptLibraryAllowedFileType,
  ScriptTagKey,
} from '../../../../common/endpoint/service/script_library/constants';
import type { ListScriptsRequestQuery } from '../../../../common/api/endpoint';
import { useHttp } from '../../../common/lib/kibana';
import type { SupportedHostOsType } from '../../../../common/endpoint/constants';
import { SCRIPTS_LIBRARY_ROUTE } from '../../../../common/endpoint/constants';
import type { EndpointScriptListApiResponse } from '../../../../common/endpoint/types';

export type AugmentedListScriptsRequestQuery = ListScriptsRequestQuery & {
  os?: SupportedHostOsType[];
  fileType?: ScriptLibraryAllowedFileType[];
  category?: ScriptTagKey[];
  searchTerms?: string[];
};

const buildDisjunctionKql = (field: string, values: string[]): string => {
  if (!values || values.length === 0) return '';
  if (values.length === 1) return `${field}:"${values[0]}"`;
  const disjunction = values.map((value) => `${field}:"${value}"`).join(' OR ');
  return `(${disjunction})`;
};

const buildConjunctionKql = (clauses: string[]): string => {
  const nonEmptyClauses = clauses.filter((clause) => clause !== '');
  if (nonEmptyClauses.length === 0) return '';
  if (nonEmptyClauses.length === 1) return nonEmptyClauses[0];
  return `${nonEmptyClauses.join(' AND ')}`;
};

const buildSearchTermKql = (searchTerms: string[]): string => {
  if (!searchTerms || searchTerms.length === 0) return '';
  const escapedSearchTerms = searchTerms.map((term) =>
    term
      .trim()
      .replace(/([\)\(\<\>\}\{\"\*\:\\])/gm, '\\$&')
      .replace(/\s/gm, '*')
  );
  const clauses = escapedSearchTerms.map(
    (term) =>
      `(name:\*${term}\* OR description:\*${term}\* OR createdBy:\*${term}\* OR updatedBy:\*${term}\* OR fileName:\*${term}\* OR fileHash:\*${term}\*)`
  );
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`;
};

export const useGetEndpointScriptsList = (
  query: AugmentedListScriptsRequestQuery,
  options: UseQueryOptions<EndpointScriptListApiResponse, IHttpFetchError<ResponseErrorBody>> = {}
): UseQueryResult<EndpointScriptListApiResponse, IHttpFetchError<ResponseErrorBody>> => {
  const http = useHttp();

  return useQuery<EndpointScriptListApiResponse, IHttpFetchError<ResponseErrorBody>>({
    queryKey: ['get-scripts-library', query],
    ...options,
    keepPreviousData: true,
    queryFn: async () => {
      const osFiltersKQl = buildDisjunctionKql('platform', query.os ?? []);
      const fileTypeFiltersKQl = buildDisjunctionKql('fileType', query.fileType ?? []);
      const categoryFiltersKQl = buildDisjunctionKql('tags', query.category ?? []);
      const searchTermKQl = buildSearchTermKql(query.searchTerms ?? []);
      // not using the query.kuery yet, but when we do we will need to add it to the augmentedKQL as well, and decide how it should interact with the new existing filters (probably just `${augmentedKQL} AND ${query.kuery}`)
      const augmentedKQL = buildConjunctionKql([
        osFiltersKQl,
        fileTypeFiltersKQl,
        categoryFiltersKQl,
        searchTermKQl,
      ]);

      return http.get<EndpointScriptListApiResponse>(SCRIPTS_LIBRARY_ROUTE, {
        version: '2023-10-31',
        query: {
          page: query?.page ?? 1,
          pageSize: query?.pageSize ?? 10,
          sortField: query?.sortField,
          sortDirection: query?.sortDirection,
          kuery: augmentedKQL.length > 0 ? augmentedKQL : undefined,
        },
      });
    },
  });
};
