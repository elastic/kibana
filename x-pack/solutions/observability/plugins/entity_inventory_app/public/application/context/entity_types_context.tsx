/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { InventoryType } from '@kbn/entity-inventory-plugin/common';
import { useKibana } from '../../hooks/use_kibana';

export interface EntityTypesContextValue {
  /** `undefined` until the first `GET /types` response arrives. */
  types?: InventoryType[];
  loading: boolean;
  error?: Error;
  refresh: () => void;
}

const EntityTypesContext = createContext<EntityTypesContextValue | null>(null);

/**
 * Loads the registered entity types once per app mount, for every page below it. The types are
 * requested again on a browser reload, a retry and leaving and re-entering the app, and not on a
 * page change or a time range change.
 */
export const EntityTypesProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    services: { inventoryApi },
  } = useKibana();
  const { value, loading, error, refresh } = useAbortableAsync(
    ({ signal }) => inventoryApi.getTypes({ signal }),
    [inventoryApi]
  );
  const contextValue = useMemo<EntityTypesContextValue>(
    () => ({ types: value?.types, loading, error, refresh }),
    [value, loading, error, refresh]
  );

  return <EntityTypesContext.Provider value={contextValue}>{children}</EntityTypesContext.Provider>;
};

/** The registered entity types of the app and the state of their request. */
export const useEntityTypes = (): EntityTypesContextValue => {
  const context = useContext(EntityTypesContext);
  if (!context) {
    throw new Error('useEntityTypes must be used within an EntityTypesProvider');
  }
  return context;
};
