/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { matchers } from '@emotion/jest';
import React from 'react';
import type { CollectionVariant } from '../types';
import { VariantRow } from './variant_row';

expect.extend(matchers);

const variant: CollectionVariant = {
  id: 'epr:nginx',
  title: 'Nginx',
  description: 'Collect logs and metrics with Elastic Agent.',
  icon: <span data-test-subj="variantIcon" />,
  href: '/app/integrations/detail/nginx',
  'data-test-subj': 'collectionVariantRow-epr:nginx',
};

describe('VariantRow', () => {
  it('renders the variant with its icon and link, without any context providers', () => {
    render(<VariantRow variant={variant} />);

    const row = screen.getByTestId('collectionVariantRow-epr:nginx');
    expect(screen.getByText('Nginx')).toBeInTheDocument();
    expect(screen.getByText('Collect logs and metrics with Elastic Agent.')).toBeInTheDocument();
    expect(screen.getByTestId('variantIcon')).toBeInTheDocument();
    expect(row.querySelector('a')).toHaveAttribute('href', '/app/integrations/detail/nginx');
  });

  // One line truncated "Nginx Ingress Controller Logs" and "…Metrics" to the same string.
  it('gives titles two lines so variants sharing a prefix stay distinguishable', () => {
    render(
      <VariantRow
        variant={{ ...variant, title: 'Nginx Ingress Controller OpenTelemetry Metrics' }}
      />
    );

    expect(screen.getByTestId('collectionVariantTitle')).toHaveStyleRule('-webkit-line-clamp', '2');
  });

  it('keeps the host badge beside the title, outside the title clamp', () => {
    render(
      <VariantRow
        variant={{ ...variant, badge: <span data-test-subj="badgeStub">Recommended</span> }}
      />
    );

    const title = screen.getByTestId('collectionVariantTitle');
    const badge = screen.getByTestId('badgeStub');
    expect(title).toHaveTextContent('Nginx');
    expect(title).not.toContainElement(badge);
    expect(title.parentElement).toContainElement(badge);
  });
});
