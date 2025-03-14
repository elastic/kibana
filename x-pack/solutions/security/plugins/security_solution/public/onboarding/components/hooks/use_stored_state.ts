/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { OnboardingCardId } from '../../constants';
import type { IntegrationTabId } from '../onboarding_body/cards/integrations/types';
import type { CardSelectorListItem } from '../onboarding_body/cards/common/card_selector_list';

const LocalStorageKey = {
  avcBannerDismissed: 'securitySolution.onboarding.avcBannerDismissed',
  videoVisited: 'securitySolution.onboarding.videoVisited',
  completeCards: 'securitySolution.onboarding.completeCards',
  expandedCard: 'securitySolution.onboarding.expandedCard',
  urlDetails: 'securitySolution.onboarding.urlDetails',
  selectedIntegrationTabId: 'securitySolution.onboarding.selectedIntegrationTabId',
  selectedCardItemId: 'securitySolution.onboarding.selectedCardItem',
  integrationSearchTerm: 'securitySolution.onboarding.integrationSearchTerm',
  assistantConnectorId: 'securitySolution.onboarding.assistantCard.connectorId',
} as const;

/**
 * Wrapper hook for useLocalStorage, but always returns the default value when not defined instead of `undefined`.
 */
export const useDefinedLocalStorage = <T = undefined>(key: string, defaultValue: T) => {
  const [value, setValue] = useLocalStorage<T>(key, defaultValue);
  return [value ?? defaultValue, setValue] as const;
};

/**
 * Stores the AVC banner dismissed state
 */
export const useStoredIsAVCBannerDismissed = () =>
  useDefinedLocalStorage<boolean>(LocalStorageKey.avcBannerDismissed, false);

/**
 * Stores the completed card IDs per space
 */
export const useStoredCompletedCardIds = (spaceId: string) =>
  useDefinedLocalStorage<OnboardingCardId[]>(`${LocalStorageKey.completeCards}.${spaceId}`, []);

/**
 * Stores the selected topic ID per space
 */
export const useStoredUrlDetails = (spaceId: string) =>
  useLocalStorage<string | null | undefined>(`${LocalStorageKey.urlDetails}.${spaceId}`);

/**
 * Stores the selected selectable card ID per space
 */
export const useStoredSelectedCardItemId = (
  cardType: 'alerts' | 'dashboards' | 'rules',
  spaceId: string,
  defaultSelectedCardItemId: CardSelectorListItem['id']
) =>
  useDefinedLocalStorage<CardSelectorListItem['id']>(
    `${LocalStorageKey.selectedCardItemId}.${cardType}.${spaceId}`,
    defaultSelectedCardItemId
  );

/**
 * Stores the selected integration tab ID per space
 */
export const useStoredIntegrationTabId = (
  spaceId: string,
  defaultSelectedTabId: IntegrationTabId
) =>
  useDefinedLocalStorage<IntegrationTabId>(
    `${LocalStorageKey.selectedIntegrationTabId}.${spaceId}`,
    defaultSelectedTabId
  );

/**
 * Stores the integration search term per space
 */
export const useStoredIntegrationSearchTerm = (spaceId: string) =>
  useDefinedLocalStorage<string | null>(
    `${LocalStorageKey.integrationSearchTerm}.${spaceId}`,
    null
  );

/**
 * Stores the integration search term per space
 */
export const useStoredAssistantConnectorId = (spaceId: string) =>
  useDefinedLocalStorage<string | undefined>(
    `${LocalStorageKey.assistantConnectorId}.${spaceId}`,
    undefined
  );
