/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { IntegrationTabId } from '../types';

const LocalStorageKey = {
  selectedIntegrationTabId: 'securitySolution.onboarding.selectedIntegrationTabId',
  integrationSearchTerm: 'securitySolution.onboarding.integrationSearchTerm',
} as const;

/**
 * Wrapper hook for useLocalStorage, but always returns the default value when not defined instead of `undefined`.
 */
export const useDefinedLocalStorage = <T = undefined>(key: string, defaultValue: T) => {
  const [value, setValue] = useLocalStorage<T>(key, defaultValue);
  return [value ?? defaultValue, setValue] as const;
};

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
