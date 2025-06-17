/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImportTimelineResult } from '../../../../common/api/timeline';

export const formatError = (importResponse: ImportTimelineResult) => {
  const formattedErrors = (importResponse.errors ?? [])
    .map((importError) => importError?.error?.message)
    .filter(Boolean);

  const error: Error & { raw_network_error?: object } = new Error(formattedErrors.join('.'));
  error.stack = undefined;
  error.name = 'Network errors';
  error.raw_network_error = importResponse;

  return error;
};
