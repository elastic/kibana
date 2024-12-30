/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import { inspect } from 'util';

export class WrappedElasticsearchClientError extends Error {
  originalError: errors.ElasticsearchClientError;
  constructor(originalError: errors.ElasticsearchClientError) {
    super(originalError.message);

    const stack = this.stack;

    this.originalError = originalError;

    if (originalError instanceof errors.ResponseError) {
      // make sure ES response body is visible when logged to the console
      // @ts-expect-error
      this.stack = {
        valueOf() {
          const value = stack?.valueOf() ?? '';
          return value;
        },
        toString() {
          const value =
            stack?.toString() +
            `\nResponse: ${inspect(originalError.meta.body, { depth: null })}\n`;
          return value;
        },
      };
    }
  }
}

export function unwrapEsResponse<T extends Promise<{ body: any }>>(
  responsePromise: T
): Promise<Awaited<T>['body']> {
  return responsePromise
    .then((res) => res.body)
    .catch((err) => {
      // make sure stacktrace is relative to where client was called
      throw new WrappedElasticsearchClientError(err);
    });
}
