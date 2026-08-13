/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import type { CollectionCardItem } from './collection_card';
import { CollectionFlyout } from './collection_flyout';

// Type-only import above survives this mock: types are erased at runtime.
jest.mock('@kbn/fleet-plugin/public', () => ({
  CardIcon: () => <span data-test-subj="variantRowIconStub" />,
}));

const member = (overrides: Partial<IntegrationCardItem>): IntegrationCardItem => ({
  id: 'epr:nginx',
  name: 'nginx',
  title: 'Nginx',
  description: 'Collect logs and metrics from Nginx with Elastic Agent.',
  url: '/app/integrations/detail/nginx/overview?returnAppId=observabilityOnboarding',
  version: '1.0.0',
  icons: [],
  integration: '',
  categories: ['observability'],
  ...overrides,
});

const card: CollectionCardItem = {
  ...member({}),
  id: 'collection:nginx',
  title: 'Nginx',
  description: 'Choose from ECS-based or OTel-based collection.',
  url: '/app/integrations/collection/nginx',
  isCollectionCard: true,
  groupMembers: [
    member({}),
    member({
      id: 'epr:nginx_otel',
      name: 'nginx_otel',
      title: 'Nginx (OpenTelemetry)',
      url: '/app/integrations/detail/nginx_otel/overview?returnAppId=observabilityOnboarding',
    }),
  ],
};

const renderFlyout = (onClose = jest.fn()) => {
  render(
    <I18nProvider>
      <CollectionFlyout card={card} onClose={onClose} />
    </I18nProvider>
  );
  return onClose;
};

describe('CollectionFlyout', () => {
  it('renders the collection title, description, and one row per member', () => {
    renderFlyout();
    expect(screen.getByRole('heading', { name: 'Nginx' })).toBeInTheDocument();
    expect(screen.getByText('Choose from ECS-based or OTel-based collection.')).toBeInTheDocument();
    expect(screen.getByTestId('collectionVariantRow-epr:nginx')).toBeInTheDocument();
    expect(screen.getByTestId('collectionVariantRow-epr:nginx_otel')).toBeInTheDocument();
  });

  it('links each member row to its own destination url', () => {
    renderFlyout();
    const otelRow = screen.getByTestId('collectionVariantRow-epr:nginx_otel');
    expect(otelRow.querySelector('a')).toHaveAttribute(
      'href',
      '/app/integrations/detail/nginx_otel/overview?returnAppId=observabilityOnboarding'
    );
  });

  it('closes through the flyout close button', async () => {
    const user = userEvent.setup();
    const onClose = renderFlyout();
    await user.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalled();
  });
});
