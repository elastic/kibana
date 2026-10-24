/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiDataGridColumn } from '@elastic/eui';
import { useDataGridColumnSelector } from '@elastic/eui';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { RumAppInventoryRow } from '../../../../common/rum_apps';

export type InventoryColumnId =
  | 'score'
  | 'sessions'
  | 'pageViews'
  | 'errorRate'
  | 'lcp'
  | 'inp'
  | 'cls'
  | 'fcp'
  | 'ttfb'
  | 'opportunity';

export type InventoryTableColumn = EuiBasicTableColumn<RumAppInventoryRow> & {
  id?: InventoryColumnId;
  selectorName?: string;
};

export const DEFAULT_INVENTORY_VISIBLE_COLUMNS: InventoryColumnId[] = [
  'score',
  'sessions',
  'errorRate',
  'lcp',
  'inp',
  'cls',
  'opportunity',
];

const STORAGE_KEY = 'ux.inventory.columns';

const readStoredColumns = (): InventoryColumnId[] | undefined => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return undefined;
    }
    const allowed = new Set<string>(
      DEFAULT_INVENTORY_VISIBLE_COLUMNS.concat(['pageViews', 'fcp', 'ttfb'])
    );
    const ids = parsed.filter(
      (id): id is InventoryColumnId => typeof id === 'string' && allowed.has(id)
    );
    return ids.length > 0 ? ids : undefined;
  } catch {
    return undefined;
  }
};

const writeStoredColumns = (ids: string[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / private mode
  }
};

export const useInventoryColumnSelector = (
  allColumns: InventoryTableColumn[]
): [Array<EuiBasicTableColumn<RumAppInventoryRow>>, ReactNode] => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    () => readStoredColumns() ?? DEFAULT_INVENTORY_VISIBLE_COLUMNS
  );

  const withId = useMemo(() => allColumns.filter((column) => column.id != null), [allColumns]);
  const locked = useMemo(() => allColumns.filter((column) => column.id == null), [allColumns]);

  const persist = useCallback((ids: string[]) => {
    writeStoredColumns(ids);
    setVisibleColumns(ids);
  }, []);

  const columns = useMemo(() => {
    const selected = visibleColumns.flatMap((id) => {
      const match = withId.find((column) => column.id === id);
      if (!match) {
        return [];
      }
      const { id: _id, selectorName: _selectorName, ...rest } = match;
      return [rest];
    });
    return [...locked, ...selected];
  }, [locked, visibleColumns, withId]);

  const selectorColumns = useMemo(
    () => withId.map((column) => ({ id: column.id })) as EuiDataGridColumn[],
    [withId]
  );

  const displayValues = useMemo(
    () =>
      withId.reduce<Record<string, string>>((acc, column) => {
        if (column.id) {
          acc[column.id] = String(column.selectorName ?? column.name ?? column.id);
        }
        return acc;
      }, {}),
    [withId]
  );

  const [ColumnSelector] = useDataGridColumnSelector(
    selectorColumns,
    { visibleColumns, setVisibleColumns: persist },
    true,
    displayValues
  );

  return [columns, ColumnSelector];
};
