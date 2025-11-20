/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, memo, useContext, useMemo } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import type { AttackDetailsProps } from './types';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { FlyoutError } from '../shared/components/flyout_error';
import { useFindAttackDiscoveries } from '../../attack_discovery/pages/use_find_attack_discoveries';

export interface AttackDetailsContext {
  /**
   * Id of the attack document
   */
  attackId: string;
  /**
   * Attack details
   */
  attack: AttackDiscoveryAlert;
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

export const AttackDetailsProvider = memo(({ attackId, children }: AttackDetailsProviderProps) => {
  const { assistantAvailability, http } = useAssistantContext();

  const { data, isLoading: loading } = useFindAttackDiscoveries({
    ids: [attackId || ''],
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
  });

  const attack = useMemo<AttackDiscoveryAlert | null>(() => data?.data?.[0] ?? null, [data]);

  const contextValue = useMemo<AttackDetailsContext | undefined>(
    () => (attack && attackId ? { attack, attackId } : undefined),
    [attackId, attack]
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
