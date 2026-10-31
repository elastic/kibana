/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

export const INVENTORY_CHART_HIDDEN_STORAGE_KEY = 'ux.inventory.hideChart';

export const readInventoryChartHidden = (): boolean => {
  try {
    return window.localStorage.getItem(INVENTORY_CHART_HIDDEN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const writeInventoryChartHidden = (hidden: boolean): void => {
  try {
    window.localStorage.setItem(INVENTORY_CHART_HIDDEN_STORAGE_KEY, String(hidden));
  } catch {
    // ignore quota / private mode
  }
};

export const useInventoryChartVisibility = (): { hidden: boolean; toggle: () => void } => {
  const [hidden, setHidden] = useState(readInventoryChartHidden);

  const toggle = useCallback(() => {
    setHidden((current) => {
      const next = !current;
      writeInventoryChartHidden(next);
      return next;
    });
  }, []);

  return { hidden, toggle };
};
