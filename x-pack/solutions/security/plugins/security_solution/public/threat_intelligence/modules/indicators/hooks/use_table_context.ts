/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import { createContext, useContext } from 'react';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';

export interface IndicatorsTableContextValue {
  expanded: Indicator | undefined;
  setExpanded: Dispatch<SetStateAction<Indicator | undefined>>;
  indicators: Indicator[];
}

export const IndicatorsTableContext = createContext<IndicatorsTableContextValue | undefined>(
  undefined
);

export const useIndicatorsTableContext = (): IndicatorsTableContextValue => {
  const contextValue = useContext(IndicatorsTableContext);

  if (!contextValue) {
    throw new Error('IndicatorTableContext has to be defined');
  }

  return contextValue;
};
