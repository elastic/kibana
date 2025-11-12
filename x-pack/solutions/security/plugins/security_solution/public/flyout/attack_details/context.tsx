/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, memo, useContext, useMemo } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import type { AttackDetailsProps } from './types';
import type { AttackDiscoveryItem } from './hooks/use_find_attack_details_by_id';
import { useFindAttackDetailsById } from './hooks/use_find_attack_details_by_id';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { FlyoutError } from '../shared/components/flyout_error';

export interface AttackDetailsContext {
  /**
   * Id of the document
   */
  documentId: string;

  dataAttackDetails: AttackDiscoveryItem;
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

export const AttackDetailsProvider = memo(({ id, children }: AttackDetailsProviderProps) => {
  const { assistantAvailability, http } = useAssistantContext();

  const { data, isLoading: loading } = useFindAttackDetailsById({
    id: id || '',
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
  });

  const contextValue = useMemo<AttackDetailsContext | undefined>(
    () => (data && id ? { dataAttackDetails: data, documentId: id } : undefined),
    [id, data]
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
});

AttackDetailsProvider.displayName = 'AttackDetailsProvider';

export const useAttackDetailsContext = (): AttackDetailsContext => {
  const contextValue = useContext(AttackDetailsContext);

  if (!contextValue) {
    throw new Error('AttackDetailsContext can only be used within AttackDetailsContext provider');
  }

  return contextValue;
};
