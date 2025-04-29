/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { AsyncAction, AsyncActionOptionalPayload } from './types';

export function createAsyncAction<Payload, SuccessPayload, ErrorPayload = IHttpFetchError>(
  actionStr: string
): AsyncActionOptionalPayload<Payload, SuccessPayload, ErrorPayload>;
export function createAsyncAction<Payload, SuccessPayload, ErrorPayload = IHttpFetchError>(
  actionStr: string
): AsyncAction<Payload, SuccessPayload, ErrorPayload> {
  return {
    get: createAction<Payload>(actionStr),
    success: createAction<SuccessPayload>(`${actionStr}_SUCCESS`),
    fail: createAction<ErrorPayload>(`${actionStr}_FAIL`),
  };
}
