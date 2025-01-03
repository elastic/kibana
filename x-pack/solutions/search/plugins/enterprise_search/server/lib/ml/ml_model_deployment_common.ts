/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchResponseError,
  isNotFoundException,
  isResourceNotFoundException,
} from '../../utils/identify_exceptions';

export function isNotFoundExceptionError(error: unknown): boolean {
  return (
    isResourceNotFoundException(error as ElasticsearchResponseError) ||
    isNotFoundException(error as ElasticsearchResponseError) ||
    // @ts-expect-error error types incorrect
    error?.statusCode === 404
  );
}
