/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  memo,
  useContext,
  useRef,
  type RefObject,
  type PropsWithChildren,
} from 'react';
import type { AlertsTableImperativeApi } from '@kbn/response-ops-alerts-table/types';

/**
 * Temporary context to share imperative APIs between the alerts table and other higher level
 * components such as the alerts details flyout
 *
 * TODO remove once the alerts table columns are controllable from the outside
 */
const AlertsContext = createContext<{
  alertsTableRef: RefObject<AlertsTableImperativeApi>;
} | null>(null);

const AlertsContextProviderComponent = ({ children }: PropsWithChildren) => {
  const alertsTableRef = useRef<AlertsTableImperativeApi>(null);
  return <AlertsContext.Provider value={{ alertsTableRef }}>{children}</AlertsContext.Provider>;
};

export const AlertsContextProvider = memo(AlertsContextProviderComponent);

export const useAlertsContext = () => {
  const fallbackRef = useRef<AlertsTableImperativeApi>(null);
  const value = useContext(AlertsContext);
  if (!value) {
    return {
      alertsTableRef: fallbackRef,
    };
  }
  return value;
};
