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
/**
 * Takes a reference object {source} and another object {target}, and returns a new object.
 * The return object simply nullifies any properties that are missing/undefined in the {target} but exist in the {source}.
 *
 * Example:
 * ```ts
 * source = { a: 1, b: 2, c: 3 }
 * target = { a: 10, b: undefined }
 * result = { a: 10, b: null, c: null }
 * ```
 * */
export const nullifyMissingProperties = <T extends object = object>(
  params: NullifyMissingProperties<T>
): T => {
  const { source: stored, target: output } = params;
  if (!stored) {
    return output;
  }
  const result: T = { ...stored, ...output };
  (Object.keys(stored) as Array<keyof T>).forEach((key) => {
    if (typeof output[key] === 'undefined') {
      result[key] = null as T[keyof T];
    }
  });
  return result;
};
