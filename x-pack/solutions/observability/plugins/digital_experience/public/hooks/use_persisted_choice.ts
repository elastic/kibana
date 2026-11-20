/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

/**
 * A choice among `allowed` values, kept in the local storage across visits: `fallback` until one
 * is stored, and for anything else in the storage, e.g. from an older version. Choosing a value
 * that is not allowed does nothing, so the callers can pass what a control gives them.
 */
export const usePersistedChoice = <TChoice extends string>(
  storageKey: string,
  allowed: readonly TChoice[],
  fallback: TChoice
): [TChoice, (choice: string) => void] => {
  const [saved, setSaved] = useLocalStorage<TChoice>(storageKey, fallback);
  const choice = allowed.find((value) => value === saved) ?? fallback;

  const choose = useCallback(
    (value: string) => {
      const allowedValue = allowed.find((candidate) => candidate === value);
      if (allowedValue !== undefined) {
        setSaved(allowedValue);
      }
    },
    [allowed, setSaved]
  );

  return [choice, choose];
};
