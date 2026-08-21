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
import { MemoryRouter } from '@kbn/shared-ux-router';
import { isCollectionCard } from './collection_card';
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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>
    <KibanaContextProvider services={coreMock.createStart()}>
      <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
    </KibanaContextProvider>
  </I18nProvider>
);

const renderItems = (searchTerm: string, allCards: IntegrationCardItem[]) =>
  renderHook(
    () => useAddDataResultItems({ searchTerm, allCards, isLoading: false, useLocalSearch }),
    { wrapper }
  );

describe('useAddDataResultItems', () => {
  it('filters to the allowed categories, text-matches, and rewrites integration URLs', () => {
    const { result } = renderItems('redis', [
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

    expect(result.current.items.map(({ name }) => name)).toEqual(['redis']);
    expect(result.current.items[0].url).toContain('returnAppId=');
  });

  // The curated tiles are always visible below the results, so mirroring them
  // into the result list only produced duplicates of the EPR cards.
  it('does not mirror curated tiles into the results', () => {
    const { result } = renderItems('docker', [
      makeCard({ id: 'epr:docker', name: 'docker', title: 'Docker', description: 'Containers.' }),
    ]);

    expect(result.current.items.map(({ id }) => id)).toEqual(['epr:docker']);
  });

  // The chooser rewrites the members it renders, so doing it here too would append
  // the return params twice on one url.
  it('passes collection members through untouched', () => {
    const collection: IntegrationCardItem = {
      ...makeCard({ id: 'collection:nginx', url: '/app/integrations/collection/nginx' }),
      isCollectionCard: true,
      groupMembers: [
        makeCard({}),
        makeCard({ id: 'epr:nginx_otel', name: 'nginx_otel', title: 'Nginx (OpenTelemetry)' }),
      ],
    };

    const { result } = renderItems('nginx', [collection]);

    const [resultCard] = result.current.items;
    if (!isCollectionCard(resultCard)) {
      throw new Error('expected the collection card to survive the pipeline');
    }
    expect(resultCard.groupMembers).toHaveLength(2);
    for (const memberUrl of resultCard.groupMembers.map(({ url }) => url)) {
      expect(memberUrl).not.toContain('returnAppId=');
    }
  });

  // Matching is Fleet's `useLocalSearch`, so this pins its semantics at our seam:
  // a Fleet change surfaces here instead of silently changing the page.
  it('matches on token prefix but not mid-word', () => {
    const prefix = renderItems('ngi', [makeCard({})]);
    expect(prefix.result.current.items.map(({ name }) => name)).toEqual(['nginx']);

    const midWord = renderItems('ginx', [makeCard({})]);
    expect(midWord.result.current.items).toEqual([]);
  });
});
