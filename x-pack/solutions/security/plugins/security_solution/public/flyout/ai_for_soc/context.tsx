/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useEventDetails } from '../document_details/shared/hooks/use_event_details';
import type { AIForSOCDetailsProps } from './types';
import { FlyoutError } from '../shared/components/flyout_error';

export interface AIForSOCDetailsContext {
  doc: DataTableRecord;
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
}

/**
 * A context provider shared by the right, left and preview panels in expandable ioc details flyout
 */
export const AIForSOCDetailsContext = createContext<AIForSOCDetailsContext | undefined>(undefined);

export type AIForSOCDetailsProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<AIForSOCDetailsProps['params']>;

export const AIForSOCDetailsProvider = memo(({ doc, children }: AIForSOCDetailsProviderProps) => {
  const { dataFormattedForFieldBrowser } = useEventDetails({
    eventId: doc?.id,
    indexName: doc?.raw._index,
  });
  const contextValue = useMemo(
    () => ({
      dataFormattedForFieldBrowser,
      doc,
    }),
    [dataFormattedForFieldBrowser, doc]
  );

  if (!contextValue || !contextValue.doc) {
    return <FlyoutError />;
  }

  return (
    <AIForSOCDetailsContext.Provider value={contextValue}>
      {children}
    </AIForSOCDetailsContext.Provider>
  );
});

AIForSOCDetailsProvider.displayName = 'AIForSOCDetailsProvider';

export const useAIForSOCDetailsContext = (): AIForSOCDetailsContext => {
  const contextValue = useContext(AIForSOCDetailsContext);

  if (!contextValue) {
    throw new Error(
      'AIForSOCDetailsContext can only be used within AIForSOCDetailsContext provider'
    );
  }

  return contextValue;
};
