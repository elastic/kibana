/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/public';

export type CallApi = typeof callApi;

export async function callApi(
  { http }: CoreStart | CoreSetup,
  options: {
    method: string;
    pathname: string;
    body?: any;
    query?: any;
    signal?: AbortSignal | null;
  }
): Promise<any> {
  const { method = 'get', pathname, body, query, signal } = options;

  const lowercaseMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';

  const res = await http[lowercaseMethod](pathname, {
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    query,
    signal: signal || undefined,
  });

  return res;
}
