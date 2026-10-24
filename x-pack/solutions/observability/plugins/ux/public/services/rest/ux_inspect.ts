/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions, HttpStart } from '@kbn/core/public';
import type { AddInspectorRequest } from '@kbn/observability-shared-plugin/public';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';

let addInspectorRequest: AddInspectorRequest | undefined;

export const setUxAddInspectorRequest = (next?: AddInspectorRequest): void => {
  addInspectorRequest = next;
};

export const takeInspect = <T>(response: T): T => {
  if (!response || typeof response !== 'object') {
    return response;
  }
  const record = response as Record<string, unknown>;
  if (addInspectorRequest && ('_inspect' in record || '_wrapped' in record)) {
    addInspectorRequest({
      data: response,
      status: FETCH_STATUS.SUCCESS,
      loading: false,
    });
  }
  if ('_wrapped' in record && '_inspect' in record) {
    return record._wrapped as T;
  }
  if ('_inspect' in record) {
    const { _inspect: _ignored, ...rest } = record;
    return rest as T;
  }
  return response;
};

export const inspectableGet = async <T>(
  http: HttpStart,
  path: string,
  options?: HttpFetchOptions
): Promise<T> => takeInspect(await http.get<T>(path, options));

export const inspectablePost = async <T>(
  http: HttpStart,
  path: string,
  options?: HttpFetchOptions
): Promise<T> => takeInspect(await http.post<T>(path, options));
