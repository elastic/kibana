/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RouteValidationError, RouteValidationResultFactory } from '@kbn/core/server';

type ValidateStringAssetFiltersReturn = [{ error: RouteValidationError }] | [null, any];

export function validateStringAssetFilters(
  q: any,
  res: RouteValidationResultFactory
): ValidateStringAssetFiltersReturn {
  try {
    if (!q.filters) return [res.badRequest(new Error(`filters is required`))];
    const parsedFilters = JSON.parse(q.filters);
    return [null, parsedFilters];
  } catch (err: any) {
    return [res.badRequest(err)];
  }
}
