/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

const DEFAULT_OPTIONS = Object.freeze({});

export function useCreateArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  customOptions: UseMutationOptions<
    ExceptionListItemSchema,
    IHttpFetchError,
    CreateExceptionListItemSchema,
    () => void
  > = DEFAULT_OPTIONS
): UseMutationResult<
  ExceptionListItemSchema,
  IHttpFetchError,
  CreateExceptionListItemSchema,
  () => void
> {
  return useMutation<
    ExceptionListItemSchema,
    IHttpFetchError,
    CreateExceptionListItemSchema,
    () => void
  >((exception: CreateExceptionListItemSchema) => {
    return exceptionListApiClient.create(exception);
  }, customOptions);
}
