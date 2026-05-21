/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ecsValueToScalarString = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return undefined;
    }
    const first = value[0];
    if (first === undefined || first === null || first === '') {
      return undefined;
    }
    if (typeof first === 'object') {
      return undefined;
    }
    return String(first);
  }
  if (typeof value === 'object') {
    return undefined;
  }
  return undefined;
};

/**
 * Maps an ECS nested slice (e.g. `_source.host`) to flattened field names
 * (`host.id`, `host.name`, …) as used by Elasticsearch hits and EUID helpers.
 *
 * Skips nested objects (e.g. `host.os`) and non-scalar array elements. For each top-level
 * key with a scalar or first array element, adds `prefix.key`.
 */
export const ecsSliceToFlattenedDocument = (
  prefix: string,
  slice: object | null | undefined
): Record<string, string> => {
  if (slice == null || typeof slice !== 'object' || Array.isArray(slice)) {
    return {};
  }
  const sliceRecord = slice as Record<string, unknown>;
  const doc: Record<string, string> = {};
  for (const key of Object.keys(sliceRecord)) {
    const scalar = ecsValueToScalarString(sliceRecord[key]);
    if (scalar !== undefined) {
      doc[`${prefix}.${key}`] = scalar;
    }
  }
  return doc;
};
