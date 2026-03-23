/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, memo, useContext, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import type { SearchHit } from '../../../common/search_strategy';
import type { AttackDetailsProps } from './types';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { FlyoutError } from '../shared/components/flyout_error';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useAttackDetails } from './hooks/use_attack_details';
import type { GetFieldsData } from '../document_details/shared/hooks/use_get_fields_data';

export const ATTACK_PREVIEW_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.right.attack.attackPreviewTitle', {
    defaultMessage: 'Preview attack details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

export interface AttackDetailsContext {
  /**
   * Id of the attack document
   */
  attackId: string;
  /**
   * The attack discovery alert object constructed from the search hit
   */
  attack: AttackDiscoveryAlert | null;
  /**
   * Index name where the attack document is stored
   */
  indexName: string;
  /**
   * Scope id for preview panels and telemetry (e.g. space id or fallback)
   */
  scopeId: string;
  /**
   * Whether this panel is rendered in preview mode.
   */
  isPreviewMode: boolean;
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
  /**
   * Refetches the attack document from the server
   */
  refetch: () => Promise<void>;
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
  ({ attackId, indexName, isPreviewMode = false, children }: AttackDetailsProviderProps) => {
    const scopeId = useSpaceId();
    // data view side: browserFields + field-browser data
    const {
      attack,
      browserFields,
      dataFormattedForFieldBrowser,
      searchHit,
      getFieldsData,
      loading,
      refetch,
    } = useAttackDetails({
      attackId,
      indexName,
    });

    const contextValue = useMemo<AttackDetailsContext | undefined>(
      () =>
        attackId &&
        attack &&
        browserFields &&
        dataFormattedForFieldBrowser &&
        indexName &&
        searchHit &&
        scopeId
          ? {
              attackId,
              attack,
              browserFields,
              indexName,
              scopeId,
              isPreviewMode,
              searchHit,
              getFieldsData,
              dataFormattedForFieldBrowser,
              refetch,
            }
          : undefined,
      [
        attackId,
        attack,
        browserFields,
        indexName,
        scopeId,
        isPreviewMode,
        dataFormattedForFieldBrowser,
        searchHit,
        getFieldsData,
        refetch,
      ]
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
