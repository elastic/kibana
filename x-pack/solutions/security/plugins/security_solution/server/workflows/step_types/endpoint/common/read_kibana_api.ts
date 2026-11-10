/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';

export const readKibanaApi = async <T>(
  contextManager: StepHandlerContext['contextManager'],
  path: string,
  signal?: AbortSignal,
  headers?: Record<string, string>
): Promise<T> => {
  signal?.throwIfAborted();
  const { body } = await contextManager.callKibanaApi<T>({
    method: 'GET',
    path,
    ...(headers ? { headers } : {}),
  });
  signal?.throwIfAborted();
  return body;
};
