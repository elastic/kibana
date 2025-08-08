/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

import { UseResultsRollupReturnValue } from '../../hooks/use_results_rollup/types';

export const ResultsRollupContext = createContext<UseResultsRollupReturnValue | null>(null);

export const useResultsRollupContext = () => {
  const context = useContext(ResultsRollupContext);
  if (context == null) {
    throw new Error(
      'useResultsRollupContext must be used inside the ResultsRollupContextProvider.'
    );
  }
  return context;
};
