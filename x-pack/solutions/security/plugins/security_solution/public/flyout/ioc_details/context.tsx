/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FieldTypesProvider } from '../../threat_intelligence/containers/field_types_provider';
import { useIndicatorById } from '../../cases/attachments/indicator/hooks/use_indicator_by_id';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { FlyoutError } from '../shared/components/flyout_error';
import { IOCDetailsContext } from '../../flyout_v2/ioc_details/context';
import type { IOCDetailsProps } from './types';

export type IOCDetailsProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<IOCDetailsProps['params']>;

/**
 * A context provider for the expandable flyout that handles loading and error states.
 */
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

IOCDetailsProvider.displayName = 'IOCDetailsProvider';
