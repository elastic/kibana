/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

const read = (key: string): string | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch (err) {
    return null;
  }
};

const write = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch (err) {
    // Ignore storage quota / privacy-mode errors — state stays in-memory.
  }
};

/**
 * Space-scoped localStorage-backed state. The key is suffixed with the space id
 * so preferences don't leak across spaces. Values are (de)serialized by the
 * provided pure functions, so the persisted shape stays validated and testable.
 *
 * NOTE (persistence approach): the Security Solution has no readily-available
 * per-user/space saved-object registry for arbitrary UI presets, so column
 * preferences and saved filter groups persist to space-scoped localStorage
 * (mirroring the mock). A future enhancement could migrate these to saved
 * objects for cross-device sharing — see the tab's final report.
 */
export const useLocalStorageState = <T>(
  baseKey: string,
  spaceId: string | undefined,
  parse: (raw: string | null) => T,
  serialize: (value: T) => string
): [T, (next: T) => void] => {
  const key = `${baseKey}.${spaceId ?? 'default'}`;
  const [value, setValue] = useState<T>(() => parse(read(key)));

  const set = useCallback(
    (next: T) => {
      setValue(next);
      write(key, serialize(next));
    },
    [key, serialize]
  );

  return [value, set];
};
