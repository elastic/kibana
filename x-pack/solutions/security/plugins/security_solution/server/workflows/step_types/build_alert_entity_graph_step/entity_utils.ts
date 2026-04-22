/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type IgnoreEntitiesConfig = Array<{ field: string; values: string[] }>;

export const fieldToEntityLabel = (field: string): string => {
  const top = field.split('.')[0];
  return top || field;
};

export const buildIgnoreMap = (ignoreEntities: IgnoreEntitiesConfig): Map<string, Set<string>> => {
  const ignoreMap = new Map<string, Set<string>>();
  for (const entry of ignoreEntities) {
    const existing = ignoreMap.get(entry.field);
    if (!existing) {
      ignoreMap.set(entry.field, new Set(entry.values));
    } else {
      for (const v of entry.values) existing.add(v);
    }
  }
  return ignoreMap;
};

export const getValuesAtPath = (obj: unknown, path: readonly string[]): unknown[] => {
  if (obj == null) return [];
  if (path.length === 0) return Array.isArray(obj) ? obj : [obj];

  // If the current value is an array, apply the same path to each item.
  if (Array.isArray(obj)) {
    return obj.flatMap((item) => getValuesAtPath(item, path));
  }

  if (typeof obj !== 'object') return [];

  const [head, ...tail] = path;
  const next = (obj as Record<string, unknown>)[head];
  return getValuesAtPath(next, tail);
};

export const extractEntityValues = (
  source: Record<string, unknown> | undefined,
  field: string,
  ignoreMap: Map<string, Set<string>>
): Set<string> => {
  const values = getValuesAtPath(source, field.split('.'))
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  const ignore = ignoreMap.get(field);
  const out = new Set<string>();
  for (const v of values) {
    if (!ignore?.has(v)) {
      out.add(v);
    }
  }
  return out;
};

export const addEntitiesWithLimit = (params: {
  known: Map<string, Set<string>>;
  field: string;
  values: Set<string>;
  maxEntitiesPerField: number;
}) => {
  const { known, field, values, maxEntitiesPerField } = params;
  if (values.size === 0) return;

  const existing = known.get(field) ?? new Set<string>();
  for (const v of values) {
    if (existing.size >= maxEntitiesPerField) break;
    existing.add(v);
  }
  known.set(field, existing);
};
