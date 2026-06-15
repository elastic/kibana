/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

/**
 * A hook that works like `useState`, but persisted to localStorage.
 *
 * @example
 * const [foo, setFoo] = useLocalStorage('foo', 'bar');
 * setFoo('baz'); // persists across reloads
 */
export const useLocalStorage = <Value>(
  key: string,
  defaultValue: Value
): [Value, (value: Value) => void] => {
  const [value, setValue] = useState<Value>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as Value) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = useCallback(
    (newValue: Value) => {
      setValue(newValue);
      try {
        window.localStorage.setItem(key, JSON.stringify(newValue));
      } catch {
        // ignore write errors (e.g. storage full or unavailable)
      }
    },
    [key]
  );

  return [value, setStoredValue];
};
