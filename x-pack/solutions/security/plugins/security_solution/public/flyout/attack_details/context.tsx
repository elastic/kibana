/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, memo, useContext, useMemo } from 'react';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { SearchHit } from '../../../common/search_strategy';
import type { AttackDetailsProps } from './types';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { FlyoutError } from '../shared/components/flyout_error';
import { useAttackDetails } from './hooks/use_attack_details';
import type { GetFieldsData } from '../document_details/shared/hooks/use_get_fields_data';

export interface AttackDetailsContext {
  /**
   * Id of the attack document
   */
  attackId: string;
  /**
   * Index name where the attack document is stored
   */
  indexName: string;
  /**
   * The actual raw document object
   */
  searchHit: SearchHit;
  /**
   * Browser fields for the data view (for field browser / flyout sections)
   */
  browserFields: BrowserFields;
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
  /**
   * Field-browser-friendly representation of the event
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
}

/**
 * A context provider for Attack Details flyout
 */
export const AttackDetailsContext = createContext<AttackDetailsContext | undefined>(undefined);

export type AttackDetailsProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<AttackDetailsProps['params']>;

export const AttackDetailsProvider = memo(
  ({ attackId, indexName, children }: AttackDetailsProviderProps) => {
    // data view side: browserFields + field-browser data
    const { browserFields, dataFormattedForFieldBrowser, searchHit, getFieldsData, loading } =
      useAttackDetails({
        attackId,
        indexName,
      });

    const contextValue = useMemo<AttackDetailsContext | undefined>(
      () =>
        attackId && browserFields && dataFormattedForFieldBrowser && indexName && searchHit
          ? {
              attackId,
              browserFields,
              indexName,
              searchHit,
              getFieldsData,
              dataFormattedForFieldBrowser,
            }
          : undefined,
      [attackId, browserFields, indexName, dataFormattedForFieldBrowser, searchHit, getFieldsData]
    );

    if (loading) {
      return <FlyoutLoading />;
    }

    if (!contextValue) {
      return <FlyoutError />;
    }

    return (
      <AttackDetailsContext.Provider value={contextValue}>{children}</AttackDetailsContext.Provider>
    );
  }
);

AttackDetailsProvider.displayName = 'AttackDetailsProvider';

export const useAttackDetailsContext = (): AttackDetailsContext => {
  const contextValue = useContext(AttackDetailsContext);

  if (!contextValue) {
    throw new Error('AttackDetailsContext can only be used within AttackDetailsContext provider');
  }

  return contextValue;
};
