/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { Indicator } from '../../../common/threat_intelligence/types/indicator';

export interface IOCDetailsContextValue {
  /**
   * Id of the indicator document
   */
  id: string;
  /**
   * The indicator document
   */
  indicator: Indicator;
}

/**
 * A context shared by the ioc details flyout components to access indicator data
 */
export const IOCDetailsContext = createContext<IOCDetailsContextValue | undefined>(undefined);

export const useIOCDetailsContext = (): IOCDetailsContextValue => {
  const contextValue = useContext(IOCDetailsContext);

  if (!contextValue) {
    throw new Error('IOCDetailsContext can only be used within IOCDetailsContext provider');
  }

  return contextValue;
};
