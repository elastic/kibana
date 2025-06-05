/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useStoredIntegrationTabId } from './use_stored_state';
import type { IntegrationTabId, Tab } from '../types';
import { useIntegrationContext } from './integration_context';

export type UseSelectedTabReturn = ReturnType<typeof useSelectedTab>;

export const useSelectedTab = () => {
  const { spaceId, integrationTabs } = useIntegrationContext();
  const [selectedId, setSelectedId] = useStoredIntegrationTabId(spaceId, integrationTabs[0].id);

  const integrationTabsById = useMemo(
    () => Object.fromEntries(integrationTabs.map((tab: Tab) => [tab.id, tab])),
    [integrationTabs]
  );

  const selectedTab = useMemo(
    () => integrationTabsById[selectedId] ?? integrationTabs[0], // fallback to first tab if not found
    [integrationTabs, integrationTabsById, selectedId]
  );

  const setSelectedTabId = useCallback(
    (id: IntegrationTabId) => {
      setSelectedId(id);
    },
    [setSelectedId]
  );
  return { selectedTab, setSelectedTabId };
};
