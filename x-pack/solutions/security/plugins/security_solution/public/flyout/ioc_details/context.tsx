/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext, useMemo } from 'react';
import { FieldTypesProvider } from '../../threat_intelligence/containers/field_types_provider';
import { useIndicatorById } from '../../cases/attachments/indicator/hooks/use_indicator_by_id';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import type { Indicator } from '../../../common/threat_intelligence/types/indicator';
import type { IOCDetailsProps } from './types';
import { FlyoutError } from '../shared/components/flyout_error';

export interface IOCDetailsContext {
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
  const { indicator, isLoading } = useIndicatorById(id || '');

  const contextValue = useMemo(
    () =>
      id && indicator
        ? {
            id,
            indicator,
          }
        : undefined,
    [id, indicator]
  );

  if (isLoading) {
    return <FlyoutLoading />;
  }

  if (!contextValue) {
    return <FlyoutError />;
  }

  return (
    <FieldTypesProvider>
      <IOCDetailsContext.Provider value={contextValue}>{children}</IOCDetailsContext.Provider>
    </FieldTypesProvider>
  );
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
