/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

const AUTO_REFRESH_STORAGE_KEY = 'slo.auto_refresh';

export function useAutoRefreshState(initialValue: boolean = true) {
  const [autoRefresh, setAutoRefreshValue] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(AUTO_REFRESH_STORAGE_KEY);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setAutoRefresh = (value: boolean | ((val: boolean) => boolean)) => {
    try {
      const valueToStore = value instanceof Function ? value(autoRefresh) : value;

      setAutoRefreshValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // noop
    }
  };

  return [autoRefresh, setAutoRefresh] as const;
}
