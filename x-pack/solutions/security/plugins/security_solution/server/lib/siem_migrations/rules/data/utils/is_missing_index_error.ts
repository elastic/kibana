/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

export const isMissingIndexError = (error: Error, index: string): boolean =>
  error instanceof errors.ResponseError &&
  error.statusCode === 404 &&
  error.body?.error?.type === 'index_not_found_exception' &&
  error.body.error.index === index;
