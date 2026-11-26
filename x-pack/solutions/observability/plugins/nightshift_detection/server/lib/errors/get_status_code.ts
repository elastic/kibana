/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';

/**
 * The HTTP status of a failure: Boom errors (which the workflows plugin throws) keep it in
 * `output.statusCode`, others expose `statusCode`.
 */
export function getStatusCode(error: unknown): number | undefined {
  if (isBoom(error)) {
    return error.output.statusCode;
  }

  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    return typeof error.statusCode === 'number' ? error.statusCode : undefined;
  }

  return undefined;
}
