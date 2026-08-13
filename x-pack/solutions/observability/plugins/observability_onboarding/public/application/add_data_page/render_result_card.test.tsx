/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { matchers } from '@emotion/jest';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { renderResultCard } from './render_result_card';

expect.extend(matchers);

// Type-only import above survives this mock: types are erased at runtime.
jest.mock('@kbn/fleet-plugin/public', () => ({
  CardIcon: () => <span data-test-subj="resultCardIconStub" />,
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

describe('renderResultCard', () => {
  it('renders the item as a grid tile card', () => {
    render(<>{renderResultCard(item)}</>);
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

  it('reserves the same two description lines as the curated grid tiles', () => {
    render(<>{renderResultCard(item)}</>);
    expect(
      screen.getByText('Collect logs and metrics from Nginx servers with Elastic Agent.')
    ).toHaveStyleRule('-webkit-line-clamp', '2');
  });

  it('opens external item urls in a new tab, matching PackageCard', () => {
    const externalItem: IntegrationCardItem = {
      ...item,
      id: 'placeholder.esf',
      url: 'https://ela.st/example-content-pack',
    };

    render(<>{renderResultCard(externalItem)}</>);

    const card = screen.getByTestId('addDataResultCard-placeholder.esf');
    expect(card.querySelector('a')).toHaveAttribute('target', '_blank');
  });
});
