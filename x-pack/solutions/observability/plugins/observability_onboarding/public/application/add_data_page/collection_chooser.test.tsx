/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { CollectionChooser } from './collection_chooser';
import { FleetCardsProvider } from './fleet_cards_provider';

const mockUseAvailablePackages = jest.fn();

// Stubbed rather than required from the real module, which executes Fleet's whole
// public bundle. The chooser renders members and never searches.
jest.mock('@kbn/fleet-plugin/public', () => {
  const ReactActual = jest.requireActual('react');
  return {
    LocalSearchHook: () => Promise.resolve({ useLocalSearch: jest.fn() }),
    AvailablePackagesHook: () =>
      Promise.resolve({ useAvailablePackages: mockUseAvailablePackages }),
    useGetSettingsQuery: () => ({ data: undefined }),
    CardIcon: () => ReactActual.createElement('span', { 'data-test-subj': 'variantRowIconStub' }),
  };
});

const member = (name: string, title: string) => ({
  id: `epr:${name}`,
  name,
  title,
  description: 'Member.',
  categories: ['observability'],
  icons: [],
  url: `/app/integrations/detail/${name}`,
  version: '1.0.0',
  integration: '',
  type: 'integration',
});

const nginxCollection = {
  id: 'collection:nginx',
  name: 'nginx',
  title: 'Nginx',
  description: 'Choose from ECS-based or OTel-based collection.',
  categories: ['observability'],
  icons: [],
  url: '/app/integrations/collection/nginx',
  version: '',
  integration: '',
  isCollectionCard: true,
  groupMembers: [member('nginx', 'Nginx'), member('nginx_otel', 'Nginx (OpenTelemetry)')],
};

const renderChooser = ({
  collection,
  searchTerm = '',
}: {
  collection?: string;
  searchTerm?: string;
}) =>
  render(
    <I18nProvider>
      <KibanaContextProvider services={coreMock.createStart()}>
        <MemoryRouter initialEntries={['/']}>
          <FleetCardsProvider enabled>
            <CollectionChooser
              collection={collection}
              searchTerm={searchTerm}
              onClose={jest.fn()}
            />
            <div data-test-subj="probeMounted" />
          </FleetCardsProvider>
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );

const memberHrefs = () =>
  screen
    .getAllByTestId(/^collectionVariantRow-/)
    .map((row) => row.querySelector('a')?.getAttribute('href') ?? '');

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAvailablePackages.mockReturnValue({
    isLoading: false,
    eprPackageLoadingError: undefined,
    allCards: [nginxCollection],
  });
});

describe('CollectionChooser', () => {
  it('shows no chooser when the url names no collection', async () => {
    renderChooser({});

    await screen.findByTestId('probeMounted');
    await waitFor(() => expect(mockUseAvailablePackages).toHaveBeenCalled());
    expect(screen.queryByTestId('collectionFlyout')).not.toBeInTheDocument();
  });

  // A refresh and a return from a member's detail page both land before Fleet's
  // packages exist, so the chooser waits rather than deciding once on mount.
  it('opens the chooser named in the url once the cards arrive', async () => {
    renderChooser({ collection: 'nginx' });

    expect(await screen.findByTestId('collectionFlyout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nginx' })).toBeInTheDocument();
    expect(screen.getAllByTestId(/^collectionVariantRow-/)).toHaveLength(2);
  });

  it('sends members back to the search term and the chooser they were picked from', async () => {
    renderChooser({ collection: 'nginx', searchTerm: 'nginx' });

    await screen.findByTestId('collectionFlyout');
    for (const href of memberHrefs()) {
      expect(href).toContain(`returnPath=${encodeURIComponent('?search=nginx&collection=nginx')}`);
    }
  });

  // How a chooser opened from a curated grid tile arrives: no search term.
  it('leaves the search out of member return paths when there is none', async () => {
    renderChooser({ collection: 'nginx' });

    await screen.findByTestId('collectionFlyout');
    for (const href of memberHrefs()) {
      expect(href).toContain(`returnPath=${encodeURIComponent('?collection=nginx')}`);
      expect(href).not.toContain('search');
    }
  });

  // Flag off, group retired, or a hand-edited url: the page stays usable.
  it('shows no chooser when no card matches the url', async () => {
    renderChooser({ collection: 'docker' });

    await screen.findByTestId('probeMounted');
    await waitFor(() => expect(mockUseAvailablePackages).toHaveBeenCalled());
    expect(screen.queryByTestId('collectionFlyout')).not.toBeInTheDocument();
  });
});
