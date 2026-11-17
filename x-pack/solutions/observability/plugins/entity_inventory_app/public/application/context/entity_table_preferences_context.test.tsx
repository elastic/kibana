/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { NO_PREFERENCES } from '../components/entity_table/use_entity_table_state';
import {
  EntityTablePreferencesProvider,
  useEntityTablePreferences,
} from './entity_table_preferences_context';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <EntityTablePreferencesProvider>{children}</EntityTablePreferencesProvider>
);

/** Two tables of different entity types under one provider, as two pages of the app. */
const renderTables = () =>
  renderHook(
    () => ({
      host: useEntityTablePreferences('host'),
      kubernetes: useEntityTablePreferences('k8s.deployment'),
    }),
    { wrapper }
  );

describe('useEntityTablePreferences', () => {
  it('starts every entity type without any choice', () => {
    const { result } = renderTables();

    expect(result.current.host.preferences).toBe(NO_PREFERENCES);
    expect(result.current.kubernetes.preferences).toBe(NO_PREFERENCES);
  });

  it('keeps the choices of one entity type apart from those of another', () => {
    const { result } = renderTables();

    act(() => result.current.host.onPreferencesChange({ visibleColumns: ['host.name'] }));

    expect(result.current.host.preferences).toEqual({ visibleColumns: ['host.name'] });
    expect(result.current.kubernetes.preferences).toBe(NO_PREFERENCES);
  });

  it('gives the choices of a type back when its table is shown again after another type', () => {
    const preferences = { visibleColumns: ['host.name'], pageSize: 50 };
    const { result, rerender } = renderHook(
      ({ entityType }: { entityType: string }) => useEntityTablePreferences(entityType),
      { wrapper, initialProps: { entityType: 'host' } }
    );
    act(() => result.current.onPreferencesChange(preferences));

    rerender({ entityType: 'k8s.deployment' });
    expect(result.current.preferences).toBe(NO_PREFERENCES);

    rerender({ entityType: 'host' });
    expect(result.current.preferences).toEqual(preferences);
  });

  it('throws outside of a provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useEntityTablePreferences('host'))).toThrow(
      'useEntityTablePreferences must be used within an EntityTablePreferencesProvider'
    );
  });
});
