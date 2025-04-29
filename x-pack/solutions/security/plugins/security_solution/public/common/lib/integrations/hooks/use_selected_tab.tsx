/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useStoredIntegrationTabId } from './use_stored_state';
import type { Tab } from '../types';

export type UseSelectedTabReturn = ReturnType<typeof useSelectedTab>;

export const useSelectedTab = ({
  spaceId,
  integrationTabs,
}: {
  spaceId: string;
  integrationTabs: Tab[];
}) => {
  const [toggleIdSelected, setSelectedTabIdToStorage] = useStoredIntegrationTabId(
    spaceId,
    integrationTabs[0].id
  );

  const integrationTabsById = useMemo(
    () => Object.fromEntries(integrationTabs.map((tab: Tab) => [tab.id, tab])),
    [integrationTabs]
  );

  const selectedTab = useMemo(
    /**
     * When toggleIdSelected from the local storage is not found in the integrationTabs,
     * we fallback to the first tab in the integrationTabs array.
     */
    () => integrationTabsById[toggleIdSelected] ?? integrationTabs[0],
    [integrationTabs, integrationTabsById, toggleIdSelected]
  );

  return { selectedTab, toggleIdSelected, setSelectedTabIdToStorage, integrationTabs };
};
