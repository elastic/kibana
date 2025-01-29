/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ExceptionListSummarySchema } from '@kbn/securitysolution-io-ts-list-types';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { parsePoliciesAndFilterToKql, parseQueryFilterToKQL } from '../../common/utils';
import type { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';
import { DEFAULT_EXCEPTION_LIST_ITEM_SEARCHABLE_FIELDS } from '../../../../common/endpoint/service/artifacts/constants';
import type { MaybeImmutable } from '../../../../common/endpoint/types';

const DEFAULT_OPTIONS = Object.freeze({});

export function useSummaryArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  options: Partial<{
    filter: string;
    policies: string[];
  }> = DEFAULT_OPTIONS,
  searchableFields: MaybeImmutable<string[]> = DEFAULT_EXCEPTION_LIST_ITEM_SEARCHABLE_FIELDS,
  customQueryOptions: Partial<UseQueryOptions<ExceptionListSummarySchema, IHttpFetchError>>
): QueryObserverResult<ExceptionListSummarySchema, IHttpFetchError> {
  const { filter = '', policies = [] } = options;

  return useQuery<ExceptionListSummarySchema, IHttpFetchError>(
    ['summary', exceptionListApiClient, filter, policies],
    () => {
      return exceptionListApiClient.summary(
        parsePoliciesAndFilterToKql({
          policies,
          kuery: parseQueryFilterToKQL(filter, searchableFields),
        })
      );
    },
    customQueryOptions
  );
}
