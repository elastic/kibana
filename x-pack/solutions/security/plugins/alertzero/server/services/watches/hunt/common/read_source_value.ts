/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Readers for a field of a hit's `_source` that work whether `_source` came back nested
 * (`{ host: { name } }`, the stored shape) or flat (`{ 'host.name': … }`, which is what an index in
 * a columnar index mode such as `logsdb_columnar` regenerates). A flat key wins over a nested path.
 */

type SourceDocument = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is SourceDocument =>
  value != null && typeof value === 'object' && !Array.isArray(value);

/** The raw value at `path`, or `undefined` when neither the flat key nor the nested path exists. */
export const readSourceValue = (source: SourceDocument, path: string): unknown => {
  if (path in source) {
    return source[path];
  }
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
};

/** Every string at `path`; a scalar counts as a one-element list. */
export const readSourceStrings = (source: SourceDocument, path: string): string[] => {
  const value = readSourceValue(source, path);
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string => typeof item === 'string');
};

/** The first string at `path`. */
export const readSourceString = (source: SourceDocument, path: string): string | undefined =>
  readSourceStrings(source, path)[0];

/** The first number at `path`. */
export const readSourceNumber = (source: SourceDocument, path: string): number | undefined => {
  const value = readSourceValue(source, path);
  const values = Array.isArray(value) ? value : [value];
  return values.find((item): item is number => typeof item === 'number');
};

/** How many distinct strings and numbers sit at `path`; a scalar counts as a one-element list. */
export const countDistinctSourceValues = (source: SourceDocument, path: string): number => {
  const value = readSourceValue(source, path);
  const values = Array.isArray(value) ? value : [value];
  return new Set(values.filter((item) => typeof item === 'string' || typeof item === 'number'))
    .size;
};
