/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { LocalSearchHook } from '@kbn/fleet-plugin/public';
import type { IntegrationCardItem, UseLocalSearchType } from '@kbn/fleet-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { useAddDataResultItems } from './use_add_data_result_items';

// The real Fleet matcher, loaded the same way production does.
let useLocalSearch: UseLocalSearchType;
beforeAll(async () => {
  ({ useLocalSearch } = await LocalSearchHook());
});

const makeCard = (overrides: Partial<IntegrationCardItem>): IntegrationCardItem => ({
  id: 'epr:nginx',
  name: 'nginx',
  title: 'Nginx',
  description: 'Web server.',
  categories: ['observability'],
  icons: [],
  url: '/app/integrations/detail/nginx',
  version: '1.0.0',
  integration: '',
  type: 'integration',
  ...overrides,
});

const mockPackages = (allCards: IntegrationCardItem[], eprPackageLoadingError?: Error) =>
  jest.fn().mockReturnValue({ isLoading: false, allCards, eprPackageLoadingError });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>
    <KibanaContextProvider services={coreMock.createStart()}>
      <MemoryRouter initialEntries={['/']}>
        <CompatRouter>{children}</CompatRouter>
      </MemoryRouter>
    </KibanaContextProvider>
  </I18nProvider>
);

describe('useAddDataResultItems', () => {
  it('filters to the allowed categories, text-matches, and rewrites integration URLs', () => {
    const useAvailablePackages = mockPackages([
      makeCard({}),
      makeCard({ id: 'epr:redis', name: 'redis', title: 'Redis', description: 'KV store.' }),
      makeCard({
        id: 'epr:crm',
        name: 'crm',
        title: 'Some CRM',
        categories: ['crm'],
        description: 'Not observability.',
      }),
    ]);

    const { result } = renderHook(
      () => useAddDataResultItems({ searchTerm: 'redis', useAvailablePackages, useLocalSearch }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.items.map(({ name }) => name)).toEqual(['redis']);
    expect(result.current.items[0].url).toContain('returnAppId=');
  });

  it('includes matching quickstart cards from the curated tiles', () => {
    const useAvailablePackages = mockPackages([]);

    const { result } = renderHook(
      () =>
        useAddDataResultItems({ searchTerm: 'kubernetes', useAvailablePackages, useLocalSearch }),
      { wrapper }
    );

    expect(result.current.items.some(({ id }) => id === 'quickstart-kubernetes')).toBe(true);
  });

  it('surfaces the Fleet package loading error', () => {
    const useAvailablePackages = mockPackages([], new Error('registry down'));

    const { result } = renderHook(
      () => useAddDataResultItems({ searchTerm: 'redis', useAvailablePackages, useLocalSearch }),
      { wrapper }
    );

    expect(result.current.error).toEqual(new Error('registry down'));
  });

  // Matching is Fleet's useLocalSearch. These two assertions lock the semantics
  // this page was built around (token prefix, no mid-word) so a Fleet change
  // shows up here instead of silently changing the page.
  it('matches on token prefix but not mid-word', () => {
    const useAvailablePackages = mockPackages([makeCard({})]);

    const prefix = renderHook(
      () => useAddDataResultItems({ searchTerm: 'ngi', useAvailablePackages, useLocalSearch }),
      { wrapper }
    );
    expect(prefix.result.current.items.map(({ name }) => name)).toEqual(['nginx']);

    const midWord = renderHook(
      () => useAddDataResultItems({ searchTerm: 'ginx', useAvailablePackages, useLocalSearch }),
      { wrapper }
    );
    expect(midWord.result.current.items).toEqual([]);
  });
});
