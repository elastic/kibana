/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext, useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { SearchHit } from '../../../common/search_strategy';
import type { GetFieldsData } from '../document_details/shared/hooks/use_get_fields_data';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { useEventDetails } from '../document_details/shared/hooks/use_event_details';
import type { AIForSOCDetailsProps } from './types';
import { FlyoutError } from '../shared/components/flyout_error';

export interface AIForSOCDetailsContext {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string;
  /**
   * The actual raw document object
   */
  searchHit: SearchHit;
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

export const AIForSOCDetailsProvider = memo(
  ({ eventId, indexName, children }: AIForSOCDetailsProviderProps) => {
    const { dataFormattedForFieldBrowser, getFieldsData, loading, searchHit } = useEventDetails({
      eventId,
      indexName,
    });
    const contextValue = useMemo(
      () =>
        dataFormattedForFieldBrowser && eventId && indexName && searchHit
          ? {
              dataFormattedForFieldBrowser,
              eventId,
              getFieldsData,
              indexName,
              searchHit,
            }
          : undefined,
      [dataFormattedForFieldBrowser, eventId, getFieldsData, indexName, searchHit]
    );

    if (loading) {
      return <FlyoutLoading />;
    }

    if (!contextValue) {
      return <FlyoutError />;
    }

    return (
      <AIForSOCDetailsContext.Provider value={contextValue}>
        {children}
      </AIForSOCDetailsContext.Provider>
    );
  }
);

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
