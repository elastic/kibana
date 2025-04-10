/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext, useMemo } from 'react';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { SearchHit } from '../../../common/search_strategy';
import type { GetFieldsData } from '../document_details/shared/hooks/use_get_fields_data';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { useEventDetails } from '../document_details/shared/hooks/use_event_details';
import type { AIForSOCDetailsProps } from './types';
import { FlyoutError } from '../shared/components/flyout_error';

export interface AIForSOCDetailsContext {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields;
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
  /**
   * The actual raw document object
   */
  searchHit: SearchHit;
}

/**
 * A context provider for the AI for SOC alert summary flyout
 */
export const AIForSOCDetailsContext = createContext<AIForSOCDetailsContext | undefined>(undefined);

export type AIForSOCDetailsProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<AIForSOCDetailsProps['params']>;

export const AIForSOCDetailsProvider = memo(
  ({ id, indexName, children }: AIForSOCDetailsProviderProps) => {
    const { browserFields, dataFormattedForFieldBrowser, getFieldsData, loading, searchHit } =
      useEventDetails({
        eventId: id,
        indexName,
      });
    const contextValue = useMemo(
      () =>
        dataFormattedForFieldBrowser && id && indexName && searchHit
          ? {
              browserFields,
              dataFormattedForFieldBrowser,
              eventId: id,
              getFieldsData,
              indexName,
              searchHit,
            }
          : undefined,
      [browserFields, dataFormattedForFieldBrowser, getFieldsData, id, indexName, searchHit]
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
