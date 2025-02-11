/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ExceptionListSummarySchema } from '@kbn/securitysolution-io-ts-list-types';

export const getSummaryExceptionListSchemaMock = (
  overrides?: Partial<ExceptionListSummarySchema>
): ExceptionListSummarySchema => {
  return {
    linux: 0,
    macos: 0,
    total: 0,
    windows: 0,
    ...(overrides || {}),
  };
};
