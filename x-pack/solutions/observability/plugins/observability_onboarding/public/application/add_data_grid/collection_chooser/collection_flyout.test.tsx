/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { CollectionVariant } from '../types';
import { CollectionFlyout } from './collection_flyout';

const variants: CollectionVariant[] = [
  {
    id: 'epr:nginx',
    title: 'Nginx',
    description: 'Elastic Agent.',
    icon: <span />,
    href: '/app/integrations/detail/nginx',
    'data-test-subj': 'collectionVariantRow-epr:nginx',
  },
  {
    id: 'epr:nginx_otel',
    title: 'Nginx (OpenTelemetry)',
    description: 'OTel collector.',
    icon: <span />,
    href: '/app/integrations/detail/nginx_otel',
    badge: <span data-test-subj="badgeStub">Recommended</span>,
    'data-test-subj': 'collectionVariantRow-epr:nginx_otel',
  },
];

const renderFlyout = (onClose = jest.fn()) => {
  render(
    <CollectionFlyout
      title="Nginx"
      description="Choose from ECS-based or OTel-based collection."
      variants={variants}
      onClose={onClose}
    />
  );
  return onClose;
};

describe('CollectionFlyout', () => {
  it('renders the collection heading, description and one row per variant', () => {
    renderFlyout();

    expect(screen.getByRole('heading', { name: 'Nginx' })).toBeInTheDocument();
    expect(screen.getByText('Choose from ECS-based or OTel-based collection.')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^collectionVariantRow-/)).toHaveLength(2);
  });

  it('links each variant row to its own destination', () => {
    renderFlyout();

    expect(
      screen.getByTestId('collectionVariantRow-epr:nginx_otel').querySelector('a')
    ).toHaveAttribute('href', '/app/integrations/detail/nginx_otel');
  });

  it('shows a badge only on the row whose variant carries one', () => {
    renderFlyout();

    expect(
      within(screen.getByTestId('collectionVariantRow-epr:nginx_otel')).getByTestId('badgeStub')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('collectionVariantRow-epr:nginx')).queryByTestId('badgeStub')
    ).not.toBeInTheDocument();
  });

  it('closes through the flyout close button', async () => {
    const user = userEvent.setup();
    const onClose = renderFlyout();

    await user.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });
});
