/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_COLUMN, LAST_SEEN_COLUMN } from '../generator';
import type { OutputColumn } from '../generator';
import type {
  EsqlValue,
  InventoryRow,
  MergeResult,
  PlanResult,
  Provenance,
  TypedOutputColumn,
} from './types';

/** The row's `last_seen` as epoch milliseconds, or null when absent or unparseable. */
export const lastSeenInstant = (row: InventoryRow): number | null => {
  const value = row[LAST_SEEN_COLUMN];
  const instant =
    typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isNaN(instant) ? null : instant;
};

const hasValue = (value: EsqlValue | undefined): value is EsqlValue =>
  value !== null && value !== undefined;

// A missing instant is older than any instant; on a tie the value already held is kept.
const isNewer = (candidate: number | null, current: number | null): boolean =>
  candidate !== null && (current === null || candidate > current);

interface EntityState {
  row: InventoryRow;
  lastSeen: number | null;
  /** Attribute column to the `last_seen` of the row that supplied its value. */
  attributeSeen: Map<string, number | null>;
}

// Under `unmapped_fields="nullify"` a plan that does not map a column's field returns type `null`,
// which says nothing about the column; a real type from a later plan wins over it.
const NULL_TYPE = 'null';

const typeColumns = (results: PlanResult[], columns: OutputColumn[]): TypedOutputColumn[] => {
  const returned = results.flatMap((result) => result.columns);
  return columns.map(({ name, kind }) => ({
    name,
    kind,
    type:
      returned.find((column) => column.name === name && column.type !== NULL_TYPE)?.type ?? null,
  }));
};

const mergeInto = (
  state: EntityState,
  row: InventoryRow,
  columns: OutputColumn[],
  provenance: Record<string, string>,
  indexPattern: string
): void => {
  const rowSeen = lastSeenInstant(row);
  columns.forEach(({ name, kind }) => {
    const value = row[name];
    if (!hasValue(value)) {
      return;
    }
    const current = state.row[name];
    if (kind === 'attribute') {
      // Compared with the row that supplied the current value, not the entity's newest row, so a
      // newer row without the attribute does not block an older row that has it.
      if (!hasValue(current) || isNewer(rowSeen, state.attributeSeen.get(name) ?? null)) {
        state.row[name] = value;
        state.attributeSeen.set(name, rowSeen);
        provenance[name] = indexPattern;
      }
      return;
    }
    if (kind === 'last_seen') {
      if (!hasValue(current) || isNewer(rowSeen, state.lastSeen)) {
        state.row[name] = value;
        state.lastSeen = rowSeen;
      }
      return;
    }
    if (!hasValue(current)) {
      state.row[name] = value;
    }
  });
};

/**
 * Merges every plan's rows by `entity.id` in plan order: attributes from the row with the newest
 * `last_seen`, `entity.id` and identity fields first non-null, `last_seen` newest; a null never
 * replaces a value.
 */
export const mergeRows = (results: PlanResult[], columns: OutputColumn[]): MergeResult => {
  const ordered = [...results].sort((a, b) => a.plan.index - b.plan.index);
  const entities = new Map<string, EntityState>();
  const provenance: Provenance = {};
  let droppedRows = 0;

  ordered.forEach(({ plan, rows }) => {
    rows.forEach((row) => {
      const id = row[ENTITY_ID_COLUMN];
      if (typeof id !== 'string') {
        droppedRows += 1;
        return;
      }
      let state = entities.get(id);
      if (!state) {
        state = { row: {}, lastSeen: null, attributeSeen: new Map() };
        entities.set(id, state);
        provenance[id] = {};
      }
      mergeInto(state, row, columns, provenance[id], plan.indexPattern);
    });
  });

  return {
    rows: [...entities.values()].map(({ row }) => row),
    columns: typeColumns(ordered, columns),
    provenance,
    droppedRows,
  };
};
