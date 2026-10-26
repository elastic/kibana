/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ImportExceptionsResponseSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { UseMutationOptions, UseMutationResult } from '@kbn/react-query';
import { useMutation } from '@kbn/react-query';
import type { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

const DEFAULT_OPTIONS = Object.freeze({});

export function useImportArtifactList(
  exceptionListApiClient: ExceptionsListApiClient,
  customOptions: UseMutationOptions<
    ImportExceptionsResponseSchema,
    IHttpFetchError<Error>,
    { file: File },
    () => void
  > = DEFAULT_OPTIONS
): UseMutationResult<
  ImportExceptionsResponseSchema,
  IHttpFetchError<Error>,
  { file: File },
  () => void
> {
  return useMutation<
    ImportExceptionsResponseSchema,
    IHttpFetchError<Error>,
    { file: File },
    () => void
  >(({ file }) => {
    return exceptionListApiClient.import(file);
  }, customOptions);
}
