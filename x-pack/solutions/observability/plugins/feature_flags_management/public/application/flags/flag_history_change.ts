/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  updateFlagRequestSchema,
  type FlagDefinition,
  type FlagHistoryItem,
  type FlagSnapshot,
} from '../../../common';

/** Fields a person edits. Timestamps and the creator are recorded on every write. */
const SUMMARY_FIELDS = ['apps', 'variations', 'name', 'description', 'value_type', 'tags'] as const;

export type FlagHistoryField = (typeof SUMMARY_FIELDS)[number];

const IGNORED_KEYS = new Set(['key', 'created_at', 'updated_at', 'created_by']);

export interface FlagHistoryChange {
  type: 'created' | 'deleted' | 'changed';
  /** Definition fields whose values differ, in display order. */
  fields: FlagHistoryField[];
  /** Environments whose evaluation rules differ, sorted by key. */
  environments: string[];
  /**
   * Only the parts that differ. `before` is the previous flag; `after` is this one.
   * Absent for a creation, a deletion, or a change with no previous snapshot.
   */
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
};

const same = (left: unknown, right: unknown): boolean => canonical(left) === canonical(right);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Empty lists are stored either omitted or as `[]`. */
const normalizeField = (field: FlagHistoryField, value: unknown): unknown => {
  if ((field === 'tags' || field === 'apps' || field === 'variations') && value === undefined) {
    return [];
  }
  return value;
};

const normalizeEnvironment = (value: unknown): unknown => {
  const record = asRecord(value);
  const { default: fallback, prerequisites, rules, ...rest } = record;
  return {
    ...rest,
    default: fallback,
    prerequisites: prerequisites ?? [],
    rules: rules ?? [],
  };
};

const environmentMap = (snapshot: FlagSnapshot | undefined): Record<string, unknown> =>
  asRecord(snapshot?.environments);

const definitionOf = (snapshot: FlagSnapshot): Record<string, unknown> => {
  const definition: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (!IGNORED_KEYS.has(key) && value !== undefined) {
      definition[key] = value;
    }
  }
  return definition;
};

/**
 * Describes how `item` differs from the immediately older snapshot.
 * `previous` is that older snapshot; history is newest-first, so it is the next row.
 */
export const describeFlagHistoryChange = (
  item: Pick<FlagHistoryItem, 'event_type' | 'snapshot'>,
  previous: FlagSnapshot | undefined
): FlagHistoryChange => {
  if (item.event_type === 'creation') {
    return { type: 'created', fields: [], environments: [], after: definitionOf(item.snapshot) };
  }
  if (item.event_type === 'deletion') {
    return { type: 'deleted', fields: [], environments: [], after: definitionOf(item.snapshot) };
  }
  if (!previous) {
    return { type: 'changed', fields: [], environments: [], after: definitionOf(item.snapshot) };
  }

  const fields = SUMMARY_FIELDS.filter(
    (field) =>
      !same(normalizeField(field, previous[field]), normalizeField(field, item.snapshot[field]))
  );
  const beforeEnvironments = environmentMap(previous);
  const afterEnvironments = environmentMap(item.snapshot);
  const environments = [
    ...new Set([...Object.keys(beforeEnvironments), ...Object.keys(afterEnvironments)]),
  ]
    .filter(
      (key) =>
        !same(
          normalizeEnvironment(beforeEnvironments[key]),
          normalizeEnvironment(afterEnvironments[key])
        )
    )
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));

  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const field of fields) {
    if (previous[field] !== undefined) {
      before[field] = previous[field];
    }
    if (item.snapshot[field] !== undefined) {
      after[field] = item.snapshot[field];
    }
  }
  if (environments.length > 0) {
    before.environments = Object.fromEntries(
      environments
        .filter((key) => beforeEnvironments[key] !== undefined)
        .map((key) => [key, beforeEnvironments[key]])
    );
    after.environments = Object.fromEntries(
      environments
        .filter((key) => afterEnvironments[key] !== undefined)
        .map((key) => [key, afterEnvironments[key]])
    );
  }

  return { type: 'changed', fields, environments, before, after };
};

/**
 * The definition to write when restoring this snapshot. Recorded metadata is dropped.
 * Returns undefined when the snapshot is not a complete flag definition.
 */
export const flagDefinitionFromSnapshot = (
  snapshot: FlagSnapshot
): Omit<FlagDefinition, 'key'> | undefined => {
  const parsed = updateFlagRequestSchema.safeParse(snapshot);
  if (!parsed.success) {
    return undefined;
  }
  const { version: _version, ...definition } = parsed.data;
  return definition;
};
