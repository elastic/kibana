/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useMemo, useState } from 'react';

type TableItem = Record<string, unknown>;
type TableItemId = string;
type TableItemRowMap = Record<TableItemId, React.ReactNode>;

interface UseExpandableRowsArgs<T> {
  getItemId: (item: T) => TableItemId;
  renderItem: (item: T) => React.ReactChild;
}

export const useExpandableRows = <T extends TableItem>(args: UseExpandableRowsArgs<T>) => {
  const { getItemId, renderItem } = args;

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<TableItemRowMap>({});

  const toggleRowExpanded = useCallback(
    (item: T) => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
      const itemId = getItemId(item);

      if (itemIdToExpandedRowMapValues[itemId]) {
        delete itemIdToExpandedRowMapValues[itemId];
      } else {
        itemIdToExpandedRowMapValues[itemId] = renderItem(item);
      }

      setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [itemIdToExpandedRowMap, getItemId, renderItem]
  );

  const isRowExpanded = useCallback(
    (item: T): boolean => {
      const itemId = getItemId(item);
      return itemIdToExpandedRowMap[itemId] != null;
    },
    [itemIdToExpandedRowMap, getItemId]
  );

  return useMemo(() => {
    return {
      itemIdToExpandedRowMap,
      getItemId,
      toggleRowExpanded,
      isRowExpanded,
    };
  }, [itemIdToExpandedRowMap, getItemId, toggleRowExpanded, isRowExpanded]);
};
