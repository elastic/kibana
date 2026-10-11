/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { matchers } from '@emotion/jest';
import React from 'react';
import type { CuratedTile } from '../types';
import { CuratedTileCard } from './curated_tile';

expect.extend(matchers);

const baseTile: CuratedTile = {
  id: 'kubernetes',
  title: 'Kubernetes',
  description: 'Monitor pod health.',
  icon: <span data-test-subj="tileIcon" />,
  'data-test-subj': 'observabilityOnboardingIntegrationTile-kubernetes',
};

describe('CuratedTileCard', () => {
  it('renders title, description and the host-provided icon without any context providers', () => {
    render(<CuratedTileCard tile={baseTile} />);
    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
    expect(screen.getByText('Monitor pod health.')).toBeInTheDocument();
    expect(screen.getByTestId('tileIcon')).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingIntegrationTile-kubernetes')
    ).toBeInTheDocument();
  });

  it('invokes the host-provided onClick', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<CuratedTileCard tile={{ ...baseTile, href: '/kubernetes', onClick }} />);
    await user.click(screen.getByTestId('observabilityOnboardingIntegrationTile-kubernetes'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders the host-provided badge inside the card', () => {
    render(
      <CuratedTileCard
        tile={{ ...baseTile, badge: <span data-test-subj="tileBadge">2 variants</span> }}
      />
    );
    const card = screen.getByTestId('observabilityOnboardingIntegrationTile-kubernetes');
    expect(card).toContainElement(screen.getByTestId('tileBadge'));
  });

  it('reserves two description lines so a short description still fills the tile', () => {
    render(
      <CuratedTileCard
        tile={{
          id: 'short',
          title: 'Short',
          description: 'One line.',
          icon: <span />,
        }}
      />
    );
    const description = screen.getByText('One line.');
    expect(description).toHaveStyleRule('-webkit-line-clamp', '2');
    expect(description).toHaveStyleRule('block-size', 'calc(2 * 1lh)');
  });

  it('holds the title to a single line so a long name cannot grow the tile', () => {
    const { container } = render(
      <CuratedTileCard
        tile={{ ...baseTile, title: 'Nginx Ingress Controller OpenTelemetry Logs' }}
      />
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyleRule('-webkit-line-clamp', '1', { target: '.euiCard__title' });
    expect(wrapper).toHaveStyleRule('block-size', 'calc(1 * 1lh)', { target: '.euiCard__title' });
  });

  it('matches the design spec for card padding and the title-description gap', () => {
    const { container } = render(<CuratedTileCard tile={baseTile} />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyleRule('padding', '12px', { target: '.euiCard' });
    expect(wrapper).toHaveStyleRule('margin-top', '2px', { target: 'euiCard__description' });
  });

  it('does not affect the grid layout, the wrapper stays out of the box tree', () => {
    const { container } = render(<CuratedTileCard tile={baseTile} />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyleRule('display', 'contents');
  });
});
