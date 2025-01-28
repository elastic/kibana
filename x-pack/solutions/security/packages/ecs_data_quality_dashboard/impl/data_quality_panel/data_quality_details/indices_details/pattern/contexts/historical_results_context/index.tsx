/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import { HistoricalResultsValue } from './types';

export const HistoricalResultsContext = createContext<HistoricalResultsValue | null>(null);

export const useHistoricalResultsContext = () => {
  const context = useContext(HistoricalResultsContext);
  if (context == null) {
    throw new Error(
      'useHistoricalResultsContext must be used inside the HistoricalResultsContextProvider.'
    );
  }
  return context;
};
