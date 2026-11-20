/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'securitySolution.ruleLibraries.listCollapsed';

// Collapsed unless the user expanded it before.
const readStoredValue = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
};

export const useLibrariesListCollapsed = () => {
  const [isCollapsed, setIsCollapsed] = useState(readStoredValue);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // The preference is only a convenience, so it is fine to lose it.
      }
      return next;
    });
  }, []);

  return { isCollapsed, toggleCollapsed };
};
