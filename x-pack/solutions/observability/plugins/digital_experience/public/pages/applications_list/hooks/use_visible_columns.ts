/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

/**
 * The columns the user chose to show, kept in local storage under `storageKey`: every column but
 * `hiddenByDefault` until they choose, ignoring saved ids of columns that no longer exist.
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
  const [saved, setSaved] = useLocalStorage<string[]>(storageKey);

  const visibleColumns = useMemo(
    () =>
      new Set(
        saved
          ? columnIds.filter((id) => saved.includes(id))
          : columnIds.filter((id) => !hiddenByDefault.includes(id))
      ),
    [saved, columnIds, hiddenByDefault]
  );

  return { visibleColumns, setVisibleColumns: (ids: TColumnId[]) => setSaved(ids) };
};
