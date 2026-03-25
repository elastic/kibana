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

export type AugmentedListScriptsRequestQuery = Exclude<ListScriptsRequestQuery, 'kuery'> & {
  os?: SupportedHostOsType[];
  fileType?: ScriptLibraryAllowedFileType[];
  category?: ScriptTagKey[];
};

const buildDisjunctionKql = (field: string, values: string[]): string => {
  if (!values || values.length === 0) return '';
  if (values.length === 1) return `${field}:"${values[0]}"`;
  const escapeQuotes = (value: string): string => value.replace(/"/g, '\\"');
  const disjunction = values.map((value) => `${field}:"${escapeQuotes(value)}"`).join(' OR ');
  return `(${disjunction})`;
};

const buildConjunctionKql = (clauses: string[]): string => {
  const nonEmptyClauses = clauses.filter((clause) => clause !== '');
  if (nonEmptyClauses.length === 0) return '';
  if (nonEmptyClauses.length === 1) return nonEmptyClauses[0];
  return `${nonEmptyClauses.join(' AND ')}`;
};

export const useGetEndpointScriptsList = (
  query: AugmentedListScriptsRequestQuery,
  options: UseQueryOptions<EndpointScriptListApiResponse, IHttpFetchError<ResponseErrorBody>> = {},
  queryKey?: string[]
): UseQueryResult<EndpointScriptListApiResponse, IHttpFetchError<ResponseErrorBody>> => {
  const http = useHttp();

  return useQuery<EndpointScriptListApiResponse, IHttpFetchError<ResponseErrorBody>>({
    queryKey: queryKey ?? ['get-scripts-library', query],
    ...options,
    keepPreviousData: true,
    queryFn: async () => {
      const osFiltersKQl = buildDisjunctionKql('platform', query.os ?? []);
      const fileTypeFiltersKQl = buildDisjunctionKql('fileType', query.fileType ?? []);
      const categoryFiltersKQl = buildDisjunctionKql('tags', query.category ?? []);
      const kuery = buildConjunctionKql([osFiltersKQl, fileTypeFiltersKQl, categoryFiltersKQl]);

      return http.get<EndpointScriptListApiResponse>(SCRIPTS_LIBRARY_ROUTE, {
        version: '2023-10-31',
        query: {
          page: query?.page ?? 1,
          pageSize: query?.pageSize ?? 10,
          sortField: query?.sortField,
          sortDirection: query?.sortDirection,
          kuery: kuery.length > 0 ? kuery : undefined, // Pass the constructed KQL query to the API
        },
      });
    },
  });
};
