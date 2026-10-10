/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { randomUUID } from 'crypto';
import type { HttpFetchOptions, HttpFetchOptionsWithPath, HttpHandler } from '@kbn/core/public';
import type { EsClient } from '@kbn/scout';
import type { KbnRequestContext } from './worker_settings';

/** Use a disposable credential, not the operator's identity, for the review and its actions. */
export const withRuleTuningIdentity = async <T>({
  operator,
  esClient,
  serviceAccountId,
  run,
}: {
  operator: KbnRequestContext;
  esClient: EsClient;
  serviceAccountId: string;
  run: (worker: KbnRequestContext, username: string) => Promise<T>;
}): Promise<T> => {
  const parts = serviceAccountId.split('/');
  if (parts.length !== 2 || parts.some((part) => !part)) {
    throw new Error('Rule Tuning requires an Elasticsearch service account principal');
  }
  const [namespace, service] = parts;
  const name = `eval-rule-tuning-${randomUUID()}`;
  const { token } = await esClient.security.createServiceToken({ namespace, service, name });
  try {
    const fetch = (async (
      pathOrOptions: string | HttpFetchOptionsWithPath,
      options?: HttpFetchOptions
    ) => {
      const request =
        typeof pathOrOptions === 'string' ? { path: pathOrOptions, ...options } : pathOrOptions;
      return operator.fetch({
        ...request,
        headers: { ...request.headers, Authorization: `Bearer ${token.value}` },
      });
    }) as HttpHandler;
    const { username } = await fetch<{ username: string }>('/internal/security/me');
    if (username !== serviceAccountId) {
      throw new Error('Rule Tuning request did not authenticate as its service account');
    }
    return await run({ fetch, spaceId: operator.spaceId }, username);
  } finally {
    await esClient.security.deleteServiceToken({ namespace, service, name });
  }
};
