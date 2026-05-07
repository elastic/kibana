/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AliasEntry {
  field: string;
  score?: number;
}

export type AliasMap = Map<string, AliasEntry[]>;

/**
 * Builds a symmetrized alias map from raw config.
 *
 * Given `{ 'source.ip': [{ field: 'destination.ip' }] }`, the result includes
 * both `source.ip -> [destination.ip]` and `destination.ip -> [source.ip]`
 * so either side can drive entity expansion and parent-link matching.
 */
export const symmetrizeAliases = (raw: Record<string, AliasEntry[]> | undefined): AliasMap => {
  const map: AliasMap = new Map();

  for (const [from, aliases] of Object.entries(raw ?? {})) {
    if (from.length > 0 && Array.isArray(aliases) && aliases.length > 0) {
      const cleaned = aliases
        .filter((a): a is AliasEntry => typeof a?.field === 'string' && a.field.length > 0)
        .filter((a) => a.field !== from);
      if (cleaned.length) {
        map.set(from, cleaned);
      }
    }
  }

  // Add reverse mappings so that lookups work in both directions.
  for (const [from, aliases] of map.entries()) {
    for (const alias of aliases) {
      const to = alias.field;
      const reverse = map.get(to) ?? [];
      const hasReverse = reverse.some((r) => r.field === from);
      if (!hasReverse) {
        reverse.push({ field: from, score: alias.score });
        map.set(to, reverse);
      }
    }
  }

  return map;
};

/**
 * Expands entity values by copying them to alias fields.
 *
 * For example, if `source.ip` has alias `destination.ip`, and the input contains
 * `source.ip -> { '10.0.0.1' }`, the output will include both
 * `source.ip -> { '10.0.0.1' }` and `destination.ip -> { '10.0.0.1' }`.
 */
export const expandEntitiesByAliases = (
  entitiesByField: Map<string, Set<string>>,
  aliasMap: AliasMap
): Map<string, Set<string>> => {
  const out = new Map<string, Set<string>>();

  for (const [field, values] of entitiesByField.entries()) {
    if (values.size) {
      const own = out.get(field) ?? new Set<string>();
      for (const v of values) own.add(v);
      out.set(field, own);

      const aliases = aliasMap.get(field) ?? [];
      for (const alias of aliases) {
        const aliasSet = out.get(alias.field) ?? new Set<string>();
        for (const v of values) aliasSet.add(v);
        out.set(alias.field, aliasSet);
      }
    }
  }

  return out;
};
