/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface NullifyMissingProperties<T> {
  source?: T;
  target: T;
}
export const nullifyMissingProperties = <T extends object = object>(
  params: NullifyMissingProperties<T>
): T => {
  const { source: stored, target: output } = params;
  if (!stored) {
    return output;
  }
  const result: T = { ...stored, ...output };
  (Object.keys(stored) as Array<keyof T>).forEach((key) => {
    if (output[key] == null) {
      result[key] = null as T[keyof T];
    }
  });
  return result;
};
