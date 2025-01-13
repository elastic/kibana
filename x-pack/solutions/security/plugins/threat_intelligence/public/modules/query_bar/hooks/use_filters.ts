/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import {
  IndicatorsFiltersContext,
  IndicatorsFiltersContextValue,
} from '../../indicators/hooks/use_filters_context';

export type UseFiltersValue = IndicatorsFiltersContextValue;

/**
 * Custom react hook housing logic for KQL bar
 * @returns Filters and TimeRange for use with KQL bar
 */
export const useFilters = () => {
  const contextValue = useContext(IndicatorsFiltersContext);

  if (!contextValue) {
    throw new Error('Filters can only be used inside IndicatorFiltersContext');
  }

  return contextValue;
};
