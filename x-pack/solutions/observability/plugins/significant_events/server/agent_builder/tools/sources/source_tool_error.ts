/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { classifyError } from '../../utils/error_utils';

/** Message the agent can relay for a failed source operation: 4xx errors verbatim, anything else classified. */
export const formatSourceToolError = (error: unknown): string => {
  if (isBoom(error) && error.output.statusCode < 500) {
    return error.message;
  }
  return classifyError(error);
};
