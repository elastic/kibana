/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, memo, useContext, useMemo } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { AttackDetailsProps } from './types';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { FlyoutError } from '../shared/components/flyout_error';
import { useFindAttackDiscoveries } from '../../attack_discovery/pages/use_find_attack_discoveries';
import { useAttackDetails } from './hooks/use_attack_details';

export interface AttackDetailsContext {
  /**
   * Id of the attack document
   */
  attackId: string;
  /**
   * Attack details
   */
  attack: AttackDiscoveryAlert;
  /**
   * Browser fields for the data view (for field browser / flyout sections)
   */
  browserFields: BrowserFields;

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
    const { assistantAvailability, http } = useAssistantContext();

    // get high-level AttackDiscoveryAlert (summary, markdown, etc.)
    const { data, isLoading: loading } = useFindAttackDiscoveries({
      ids: [attackId || ''],
      http,
      isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    });

    // data view side: browserFields + field-browser data
    const {
      browserFields,
      dataAsNestedObject,
      dataFormattedForFieldBrowser,
      loading: detailsLoading,
    } = useAttackDetails({
      attackId,
      indexName,
    });

    const attack = useMemo<AttackDiscoveryAlert | null>(() => data?.data?.[0] ?? null, [data]);

    const contextValue = useMemo<AttackDetailsContext | undefined>(
      () =>
        attack && attackId && browserFields && dataAsNestedObject && dataFormattedForFieldBrowser
          ? {
              attack,
              attackId,
              browserFields,
              dataAsNestedObject,
              dataFormattedForFieldBrowser,
            }
          : undefined,
      [attack, attackId, browserFields, dataAsNestedObject, dataFormattedForFieldBrowser]
    );

    if (loading || detailsLoading) {
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
