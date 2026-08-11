/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosError } from 'axios';

export function getSanitizedError(error: Error | AxiosError) {
  if (error instanceof AxiosError) {
    return {
      code: error.code,
      status: error.response?.status || error.request?.status || null,
      message: error.message,
    };
  }

  return {
    message: error.message,
    stack: error.stack,
    name: error.name,
  };
}
