/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

/**
 * The columns to show. Local storage keeps the ones the user hid, under `storageKey`, so a column
 * added later shows up for them too; `hiddenByDefault` applies until they choose.
 */
export const useVisibleColumns = <TColumnId extends string>({
  storageKey,
  columnIds,
  hiddenByDefault,
}: {
  storageKey: string;
  columnIds: readonly TColumnId[];
  hiddenByDefault: readonly TColumnId[];
}) => {
  const [savedHidden, setSavedHidden] = useLocalStorage<string[]>(storageKey);

  const visibleColumns = useMemo(() => {
    const hidden: readonly string[] = savedHidden ?? hiddenByDefault;
    return new Set(columnIds.filter((id) => !hidden.includes(id)));
  }, [savedHidden, columnIds, hiddenByDefault]);

  const setVisibleColumns = (ids: TColumnId[]) =>
    setSavedHidden(columnIds.filter((id) => !ids.includes(id)));

  return { visibleColumns, setVisibleColumns };
};
