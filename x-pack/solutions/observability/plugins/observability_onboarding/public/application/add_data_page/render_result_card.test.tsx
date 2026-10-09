/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { matchers } from '@emotion/jest';
import { I18nProvider } from '@kbn/i18n-react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import type { CollectionCardItem } from './collection_card';
import { createRenderResultCard } from './render_result_card';
import type { TrackTileClick } from './use_track_tile_click';

expect.extend(matchers);

// Type-only import above survives this mock: types are erased at runtime.
jest.mock('@kbn/fleet-plugin/public', () => ({
  CardIcon: () => <span data-test-subj="resultCardIconStub" />,
  SearchMemberMatchDescription: ({
    memberTitles,
    collectionTitle,
  }: {
    memberTitles: string[];
    collectionTitle: string;
  }) => (
    <span data-test-subj="searchMemberMatchStub">{`${memberTitles.join(
      ' + '
    )} in ${collectionTitle}`}</span>
  ),
}));

const item: IntegrationCardItem = {
  id: 'epr:nginx',
  name: 'nginx',
  title: 'Nginx',
  description: 'Collect logs and metrics from Nginx servers with Elastic Agent.',
  url: '/app/integrations/detail/nginx-1.0.0/overview',
  version: '1.0.0',
  icons: [],
  integration: '',
  categories: ['observability'],
};

const collectionItem: CollectionCardItem = {
  ...item,
  id: 'collection:nginx',
  description: 'Choose from ECS-based or OTel-based collection.',
  url: '/app/integrations/collection/nginx',
  isCollectionCard: true,
  groupMembers: [
    item,
    { ...item, id: 'epr:nginx_otel', name: 'nginx_otel', title: 'Nginx (OpenTelemetry)' },
  ],
};

const reportTileClick = jest.fn();
const trackTileClick: TrackTileClick = (fields, onClick) => (event) => {
  reportTileClick(fields);
  onClick?.(event);
};

beforeEach(() => {
  jest.clearAllMocks();
});

const renderCard = (target: IntegrationCardItem, onOpenCollection = jest.fn()) => {
  render(
    <I18nProvider>
      {createRenderResultCard({ onOpenCollection, trackTileClick })(target)}
    </I18nProvider>
  );
  return onOpenCollection;
};

describe('createRenderResultCard', () => {
  it('renders the item as a grid tile card', () => {
    renderCard(item);
    const card = screen.getByTestId('addDataResultCard-epr:nginx');
    expect(card).toBeInTheDocument();
    expect(screen.getByText('Nginx')).toBeInTheDocument();
    expect(
      screen.getByText('Collect logs and metrics from Nginx servers with Elastic Agent.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('resultCardIconStub')).toBeInTheDocument();
    expect(card.querySelector('a')).toHaveAttribute(
      'href',
      '/app/integrations/detail/nginx-1.0.0/overview'
    );
    expect(card.querySelector('a')).not.toHaveAttribute('target');
  });

  it('explains which bundled service the search matched instead of the description', () => {
    renderCard({
      ...item,
      searchMemberMatch: { memberTitles: ['Amazon GuardDuty'], collectionTitle: 'AWS' },
    });

    expect(screen.getByTestId('searchMemberMatchStub')).toHaveTextContent(
      'Amazon GuardDuty in AWS'
    );
    expect(
      screen.queryByText('Collect logs and metrics from Nginx servers with Elastic Agent.')
    ).not.toBeInTheDocument();
  });

  it('reports a plain result click with the card id', async () => {
    const user = userEvent.setup();
    renderCard(item);

    await user.click(screen.getByText('Nginx'));

    expect(reportTileClick).toHaveBeenCalledWith({
      tile_id: 'epr:nginx',
      surface: 'search_result',
    });
  });

  it('reserves the same two description lines as the curated grid tiles', () => {
    renderCard(item);
    expect(
      screen.getByText('Collect logs and metrics from Nginx servers with Elastic Agent.')
    ).toHaveStyleRule('-webkit-line-clamp', '2');
  });

  it('opens external item urls in a new tab, matching PackageCard', () => {
    renderCard({ ...item, id: 'placeholder.esf', url: 'https://ela.st/example-content-pack' });
    const card = screen.getByTestId('addDataResultCard-placeholder.esf');
    expect(card.querySelector('a')).toHaveAttribute('target', '_blank');
  });

  it('renders a collection card with a variant count badge that opens the chooser', async () => {
    const user = userEvent.setup();
    const onOpenCollection = renderCard(collectionItem);

    const card = screen.getByTestId('addDataResultCard-collection:nginx');
    expect(card).toHaveTextContent('2 variants');
    // The chooser opens in place, so the card must not also navigate.
    expect(card.querySelector('a')).not.toBeInTheDocument();

    await user.click(screen.getByText('Nginx'));
    expect(onOpenCollection).toHaveBeenCalledWith('nginx');
    expect(reportTileClick).toHaveBeenCalledWith({
      tile_id: 'collection:nginx',
      surface: 'search_result',
      collection_id: 'nginx',
    });
  });

  it('explains which member the search matched on a collection card', () => {
    renderCard({
      ...collectionItem,
      searchMemberMatch: { memberTitles: ['Nginx (OpenTelemetry)'], collectionTitle: 'Nginx' },
    });

    expect(screen.getByTestId('searchMemberMatchStub')).toHaveTextContent(
      'Nginx (OpenTelemetry) in Nginx'
    );
    expect(
      screen.queryByText('Choose from ECS-based or OTel-based collection.')
    ).not.toBeInTheDocument();
  });

  it('renders a singleton collection as a plain card, mirroring Fleet degradation', () => {
    const singleton: CollectionCardItem = {
      ...collectionItem,
      groupMembers: [item],
      url: '/app/integrations/detail/nginx-1.0.0/overview',
    };
    renderCard(singleton);

    const card = screen.getByTestId('addDataResultCard-collection:nginx');
    expect(card.querySelector('a')).toHaveAttribute(
      'href',
      '/app/integrations/detail/nginx-1.0.0/overview'
    );
    expect(card).not.toHaveTextContent('variant');
  });
});
