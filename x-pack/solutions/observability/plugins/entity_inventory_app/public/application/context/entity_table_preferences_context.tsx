/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { EntityTablePreferences } from '../components/entity_table/use_entity_table_state';
import { NO_PREFERENCES } from '../components/entity_table/use_entity_table_state';

type PreferencesByType = Readonly<Record<string, EntityTablePreferences>>;

interface EntityTablePreferencesContextValue {
  preferencesByType: PreferencesByType;
  setPreferences: (entityType: string, preferences: EntityTablePreferences) => void;
}

const EntityTablePreferencesContext = createContext<EntityTablePreferencesContextValue | null>(
  null
);

/**
 * Keeps the column, sort and page size choices of the results tables, per entity type, for as
 * long as the app is open. It sits above the routes, so the choices survive moving to a page
 * without a table, an empty range and a failed load. They are not persisted (#6330).
 */
export const EntityTablePreferencesProvider = ({ children }: { children: React.ReactNode }) => {
  const [preferencesByType, setPreferencesByType] = useState<PreferencesByType>({});
  const setPreferences = useCallback(
    (entityType: string, preferences: EntityTablePreferences) =>
      setPreferencesByType((previous) => ({ ...previous, [entityType]: preferences })),
    []
  );
  const value = useMemo(
    () => ({ preferencesByType, setPreferences }),
    [preferencesByType, setPreferences]
  );

  return (
    <EntityTablePreferencesContext.Provider value={value}>
      {children}
    </EntityTablePreferencesContext.Provider>
  );
};

/** The kept choices of one entity type and the way to change them. */
export const useEntityTablePreferences = (entityType: string) => {
  const context = useContext(EntityTablePreferencesContext);
  if (!context) {
    throw new Error(
      'useEntityTablePreferences must be used within an EntityTablePreferencesProvider'
    );
  }
  const { preferencesByType, setPreferences } = context;
  const onPreferencesChange = useCallback(
    (preferences: EntityTablePreferences) => setPreferences(entityType, preferences),
    [entityType, setPreferences]
  );

  return {
    preferences: preferencesByType[entityType] ?? NO_PREFERENCES,
    onPreferencesChange,
  };
};
