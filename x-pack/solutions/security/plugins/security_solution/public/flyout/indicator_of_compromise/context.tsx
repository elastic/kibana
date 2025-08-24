/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext, useMemo } from 'react';
import type { IOCDetailsProps } from './types';
import { FlyoutError } from '../shared/components/flyout_error';

export interface IOCDetailsContext {
  /**
   *
   */
  id: string;
}

/**
 * A context provider shared by the right, left and preview panels in expandable ioc details flyout
 */
export const IOCDetailsContext = createContext<IOCDetailsContext | undefined>(undefined);

export type IOCDetailsProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<IOCDetailsProps['params']>;

export const IOCDetailsProvider = memo(({ id, children }: IOCDetailsProviderProps) => {
  const contextValue = useMemo(
    () =>
      id
        ? {
            id,
          }
        : undefined,
    [id]
  );

  if (!contextValue) {
    return <FlyoutError />;
  }

  return <IOCDetailsContext.Provider value={contextValue}>{children}</IOCDetailsContext.Provider>;
});

IOCDetailsProvider.displayName = 'DocumentDetailsProvider';

export const useIOCDetailsContext = (): IOCDetailsContext => {
  const contextValue = useContext(IOCDetailsContext);

  if (!contextValue) {
    throw new Error(
      'DocumentDetailsContext can only be used within DocumentDetailsContext provider'
    );
  }

  return contextValue;
};
