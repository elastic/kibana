/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { OnboardingCardId } from '../../constants';
import type { CardSelectorListItem } from '../onboarding_body/cards/common/card_selector_list';
import { useDefinedLocalStorage } from '../../../common/lib/integrations/hooks/use_stored_state';

const LocalStorageKey = {
  videoVisited: 'securitySolution.onboarding.videoVisited',
  completeCards: 'securitySolution.onboarding.completeCards',
  expandedCard: 'securitySolution.onboarding.expandedCard',
  urlDetails: 'securitySolution.onboarding.urlDetails',
  selectedCardItemId: 'securitySolution.onboarding.selectedCardItem',
  assistantConnectorId: 'securitySolution.onboarding.assistantCard.connectorId',
} as const;

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
  cardType: 'alerts' | 'dashboards' | 'rules' | 'knowledgeSource',
  spaceId: string,
  defaultSelectedCardItemId: CardSelectorListItem['id']
) =>
  useDefinedLocalStorage<CardSelectorListItem['id']>(
    `${LocalStorageKey.selectedCardItemId}.${cardType}.${spaceId}`,
    defaultSelectedCardItemId
  );

/**
 * Stores the integration search term per space
 */
export const useStoredAssistantConnectorId = (spaceId: string) =>
  useDefinedLocalStorage<string | undefined>(
    `${LocalStorageKey.assistantConnectorId}.${spaceId}`,
    undefined
  );
