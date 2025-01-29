/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';

import { createUsageTracker, createEmptyUsageTracker } from '../services/usage_tracker';
import { AppUsageTracker } from '../types';

const UsageTrackerContext = createContext<AppUsageTracker>(createEmptyUsageTracker());

export interface UsageTrackerContextProviderProps {
  children: React.ReactNode | React.ReactNode[];
  usageCollection?: UsageCollectionSetup | UsageCollectionStart;
}
export function UsageTrackerContextProvider({
  children,
  usageCollection,
}: UsageTrackerContextProviderProps) {
  const usageTracker = useMemo(() => {
    const searchIndicesUsageTracker = createUsageTracker(usageCollection);
    searchIndicesUsageTracker.load('opened_app');
    return searchIndicesUsageTracker;
  }, [usageCollection]);
  return (
    <UsageTrackerContext.Provider value={usageTracker}>{children}</UsageTrackerContext.Provider>
  );
}

export const useUsageTracker = () => {
  const ctx = useContext(UsageTrackerContext);
  if (!ctx) {
    throw new Error('UsageTrackerContext should be used inside of the UsageTrackerContextProvider');
  }
  return ctx;
};
