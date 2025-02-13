/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export function isDefinedAndHasValue(value: string | undefined): value is string {
  return isDefined(value) && value.length > 0;
}

export const combineSource = (value: string | string[], separator: string = ''): string => {
  if (Array.isArray(value)) return value.join(separator);
  return value;
};
