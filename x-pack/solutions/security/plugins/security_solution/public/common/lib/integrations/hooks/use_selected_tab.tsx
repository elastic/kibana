/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { useStoredIntegrationTabId } from './use_stored_state';
import type { IntegrationTabId, Tab } from '../types';
import { useIntegrationContext } from './integration_context';

export type UseSelectedTabReturn = ReturnType<typeof useSelectedTab>;

export const useSelectedTab = (source: string) => {
  console.log(`useSelectedTab called from: ${source}`);
  const { spaceId, integrationTabs } = useIntegrationContext();
  const [lastTabId, setLastTabIdToStorage] = useStoredIntegrationTabId(
    spaceId,
    integrationTabs[0].id
  );

  const [toggleIdSelected, setToggleIdSelected] = useState(lastTabId);

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

  const setSelectedTabIdToStorage = useCallback(
    (id: IntegrationTabId) => {
      setToggleIdSelected(id);
      setLastTabIdToStorage(id);
    },
    [setLastTabIdToStorage]
  );
  console.log(`useSelectedTab returning: ${JSON.stringify(selectedTab)}`);
  return { selectedTab, toggleIdSelected, setSelectedTabIdToStorage, integrationTabs };
};
